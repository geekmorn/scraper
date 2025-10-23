import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'
import { DocsController } from './docs/docs.controller'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  const app = await NestFactory.create(AppModule)

  // Get the docs controller and set the app reference
  const docsController = app.get(DocsController)
  docsController.setApp(app)

  await app.listen(3000)
  logger.debug('Application is running on: http://localhost:3000')
  logger.debug('Scalar API Documentation is available at: http://localhost:3000/docs')
}
bootstrap()
