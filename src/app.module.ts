import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { RedditModule } from './reddit/reddit.module'
import { DatabaseModule } from './database/database.module'
import { TrendAnalysisModule } from './trend-analysis/trend-analysis.module'
import { DocsModule } from './docs/docs.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    RedditModule,
    TrendAnalysisModule,
    DocsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
