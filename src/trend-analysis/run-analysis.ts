import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { TrendAnalysisService } from './trend-analysis.service'

async function runAnalysis() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const trendAnalysisService = app.get(TrendAnalysisService)

  console.log('🚀 Starting Trend Analysis...\n')

  try {
    // Run analysis for the last 30 days
    const report = await trendAnalysisService.generateReport(30)
    console.log(report)
  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
  } finally {
    await app.close()
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runAnalysis()
}

export { runAnalysis }
