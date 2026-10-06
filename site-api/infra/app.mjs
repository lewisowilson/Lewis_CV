// lewis-wilson.com public site API (eu-west-2): FTSE sea state, printed-pass requests, multiplayer sky.
// Deliberately separate from the private placement portal so nothing public touches it.
import { App, CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration, WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as ddb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import { fileURLToPath } from 'node:url'

const ORIGINS = ['https://lewis-wilson.com', 'https://www.lewis-wilson.com', 'http://127.0.0.1:5180', 'http://127.0.0.1:4180', 'http://localhost:5180']
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL // set at deploy time; never committed
const code = lambda.Code.fromAsset(fileURLToPath(new URL('../lambda', import.meta.url)), { exclude: ['*.test.mjs'] })

const app = new App()
const stack = new Stack(app, 'LewisSiteApi', { env: { region: 'eu-west-2' } })

const fn = (id, handler, extra = {}) =>
  new lambda.Function(stack, id, {
    runtime: lambda.Runtime.NODEJS_22_X,
    architecture: lambda.Architecture.ARM_64,
    code,
    handler,
    memorySize: 256,
    timeout: Duration.seconds(10),
    logRetention: logs.RetentionDays.TWO_WEEKS,
    ...extra,
  })

// Pass requests: auto-deleted after 120 days via TTL.
const passTable = new ddb.Table(stack, 'PassRequests', {
  partitionKey: { name: 'pk', type: ddb.AttributeType.STRING },
  billingMode: ddb.BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
  removalPolicy: RemovalPolicy.RETAIN,
})
const topic = new sns.Topic(stack, 'PassRequestTopic', { displayName: 'lewis-wilson.com pass requests' })
if (NOTIFY_EMAIL) topic.addSubscription(new subs.EmailSubscription(NOTIFY_EMAIL))

const market = fn('Market', 'market.handler')
const pass = fn('PassRequest', 'pass.handler', { environment: { TABLE: passTable.tableName, TOPIC: topic.topicArn } })
passTable.grantReadWriteData(pass)
topic.grantPublish(pass)

const http = new apigw.HttpApi(stack, 'Http', {
  corsPreflight: { allowOrigins: ORIGINS, allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST], allowHeaders: ['content-type'], maxAge: Duration.hours(1) },
})
http.addRoutes({ path: '/market', methods: [apigw.HttpMethod.GET], integration: new HttpLambdaIntegration('MarketInt', market) })
http.addRoutes({ path: '/pass-request', methods: [apigw.HttpMethod.POST], integration: new HttpLambdaIntegration('PassInt', pass) })
// Keep abuse cheap: low default throttle on the whole API.
const httpStage = http.defaultStage.node.defaultChild
httpStage.defaultRouteSettings = { throttlingBurstLimit: 20, throttlingRateLimit: 10 }

// Multiplayer sky: connections expire after 2 hours via TTL.
const conns = new ddb.Table(stack, 'SkyConnections', {
  partitionKey: { name: 'pk', type: ddb.AttributeType.STRING },
  billingMode: ddb.BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
  removalPolicy: RemovalPolicy.DESTROY,
})
const sky = fn('Sky', 'sky.handler', { environment: { TABLE: conns.tableName } })
conns.grantReadWriteData(sky)
const ws = new apigw.WebSocketApi(stack, 'SkyWs', {
  connectRouteOptions: { integration: new WebSocketLambdaIntegration('C', sky) },
  disconnectRouteOptions: { integration: new WebSocketLambdaIntegration('D', sky) },
  defaultRouteOptions: { integration: new WebSocketLambdaIntegration('M', sky) },
})
const wsStage = new apigw.WebSocketStage(stack, 'SkyStage', {
  webSocketApi: ws,
  stageName: 'live',
  autoDeploy: true,
  throttle: { burstLimit: 50, rateLimit: 25 },
})
ws.grantManageConnections(sky)

new CfnOutput(stack, 'HttpUrl', { value: http.apiEndpoint })
new CfnOutput(stack, 'SkyUrl', { value: wsStage.url })
