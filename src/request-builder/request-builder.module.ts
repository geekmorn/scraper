import { Module } from '@nestjs/common'
import { RequestBuilderController } from './request-builder.controller'
import { PayloadAssemblyService } from './request-builder.service'

@Module({
  controllers: [RequestBuilderController],
  providers: [PayloadAssemblyService],
})
export class RequestBuilderModule {}
