import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { TrendAnalysisService } from './trend-analysis.service'

@Injectable()
export class TrendAnalysisScheduler implements OnModuleInit {
  private readonly logger = new Logger(TrendAnalysisScheduler.name)

  constructor(private readonly trendAnalysisService: TrendAnalysisService) {}

  async onModuleInit() {
    // const report = await this.trendAnalysisService.generateReport(180)
    // console.log(report)
  }

  // Run every day at 9:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyAnalysis() {
    this.logger.log('Starting daily trend analysis...')

    try {
      const report = await this.trendAnalysisService.generateReport(180) // Last 7 days
      console.log(report)
      this.logger.log('Daily trend analysis completed successfully')
    } catch (error) {
      this.logger.error('Daily trend analysis failed:', error)
    }
  }

  // Run every Monday at 10:00 AM for weekly analysis
  @Cron('0 10 * * 1')
  async handleWeeklyAnalysis() {
    this.logger.log('Starting weekly trend analysis...')

    try {
      const report = await this.trendAnalysisService.generateReport(30) // Last 30 days
      console.log(report)
      this.logger.log('Weekly trend analysis completed successfully')
    } catch (error) {
      this.logger.error('Weekly trend analysis failed:', error)
    }
  }

  // Manual trigger method for testing
  async runManualAnalysis(days: number = 30) {
    this.logger.log(`Running manual trend analysis for ${days} days...`)

    try {
      const report = await this.trendAnalysisService.generateReport(days)
      console.log(report)
      this.logger.log('Manual trend analysis completed successfully')
    } catch (error) {
      this.logger.error('Manual trend analysis failed:', error)
    }
  }
}
