import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { DatabaseModule } from '../database/database.module'
import { TrendAnalysisService } from './trend-analysis.service'
import { TrendAnalysisScheduler } from './trend-analysis.scheduler'

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), DatabaseModule],
  providers: [TrendAnalysisService, TrendAnalysisScheduler],
  exports: [TrendAnalysisService],
})
export class TrendAnalysisModule {}
