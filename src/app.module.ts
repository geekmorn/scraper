import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { RequestBuilderModule } from './request-builder/request-builder.module'
import { RedditModule } from './reddit/reddit.module'
import { DatabaseModule } from './database/database.module'
import { TrendAnalysisModule } from './trend-analysis/trend-analysis.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RequestBuilderModule,
    RedditModule,
    TrendAnalysisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
