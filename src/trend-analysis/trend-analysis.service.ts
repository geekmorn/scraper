import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { RedditPostRepository } from '../repositories/reddit-post.repository'
import { RedditPost } from '../schemas/reddit-post.schema'

export interface TrendAnalysisResult {
  trend: string
  growthPercentage: number
  timePeriod: string
  marketAnalysis: string
  competitionLevel: string
  entryCost: string
  recommendation: string
  confidence: number
}

export interface ProblemAnalysis {
  problem: string
  frequency: number
  severity: string
  potentialSolutions: string[]
  marketSize: string
  urgency: string
}

@Injectable()
export class TrendAnalysisService {
  private readonly logger = new Logger(TrendAnalysisService.name)
  private genAI: GoogleGenerativeAI
  private circuitBreakerOpen = false
  private circuitBreakerResetTime = 0
  private readonly circuitBreakerTimeout = 5 * 60 * 1000 // 5 minutes
  private readonly aiModel = 'gemini-2.0-flash-lite'

  constructor(
    private readonly configService: ConfigService,
    private readonly redditPostRepository: RedditPostRepository,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_KEY')
    const project = this.configService.get<string>('GEMINI_PROJECT')

    if (!apiKey) {
      throw new Error('GEMINI_KEY is not configured')
    }
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  async analyzeTrends(days: number = 30): Promise<TrendAnalysisResult[]> {
    this.logger.log(`Starting trend analysis for the last ${days} days`)

    try {
      // Get posts from the last N days
      const posts = await this.getRecentPosts(days)

      if (posts.length === 0) {
        this.logger.warn('No posts found for analysis')
        return []
      }

      // Analyze trends using Gemini
      const trends = await this.analyzeWithGemini(posts)

      this.logger.log(`Found ${trends.length} trends`)
      return trends
    } catch (error) {
      this.logger.error('Error during trend analysis:', error)
      throw error
    }
  }

  async analyzeProblems(days: number = 30): Promise<ProblemAnalysis[]> {
    this.logger.log(`Starting problem analysis for the last ${days} days`)

    try {
      const posts = await this.getRecentPosts(days)

      if (posts.length === 0) {
        this.logger.warn('No posts found for problem analysis')
        return []
      }

      const problems = await this.analyzeProblemsWithGemini(posts)

      this.logger.log(`Found ${problems.length} problems`)
      return problems
    } catch (error) {
      this.logger.error('Error during problem analysis:', error)
      throw error
    }
  }

  private async getRecentPosts(days: number): Promise<RedditPost[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000)

    return await this.redditPostRepository
      .findAll(1000, 0)
      .then((posts) => posts.filter((post) => post.created_utc >= cutoffTimestamp))
  }

  private async analyzeWithGemini(posts: RedditPost[], limit = 500): Promise<TrendAnalysisResult[]> {
    // Check circuit breaker
    if (this.circuitBreakerOpen && Date.now() < this.circuitBreakerResetTime) {
      this.logger.warn('Circuit breaker is open, using fallback analysis')
      return this.getFallbackTrendAnalysis(posts)
    }

    const maxRetries = 3
    const retryDelay = 2000 // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.aiModel })

        // Prepare data for analysis (limit to avoid token limits)
        const postsData = posts.slice(0, limit).map((post) => ({
          title: post.title,
          subreddit: post.subreddit,
          score: post.score,
          comments: post.num_comments,
          date: new Date(post.created_utc * 1000).toISOString(),
          selftext: post.selftext?.substring(0, 200) || '',
        }))

        console.log('postsData ==> ', postsData.length)

        const prompt = `
Analyze the following Reddit posts to identify emerging trends and business opportunities. 
Focus on finding problems that could be solved with SaaS products or services.

Posts data:
${JSON.stringify(postsData, null, 2)}

Please analyze and return trends in the following JSON format:
[
  {
    "trend": "Brief description of the trend",
    "growthPercentage": 47,
    "timePeriod": "3 months",
    "marketAnalysis": "Analysis of market potential and size",
    "competitionLevel": "Low/Medium/High",
    "entryCost": "Low/Medium/High",
    "recommendation": "Specific recommendation for SaaS opportunity",
    "confidence": 85
  }
]

Focus on:
1. Problems people are discussing that could be solved with software
2. Growing interest in specific tools or services
3. Pain points in existing workflows
4. Emerging needs in specific industries or niches
5. Opportunities for AI-powered solutions

Return only valid JSON, no additional text.
`
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        // Parse JSON response
        const jsonString = text.replace(/^```json\s*|```$/g, '')
        // console.log(jsonString)
        const trends = JSON.parse(jsonString)

        // Reset circuit breaker on success
        this.circuitBreakerOpen = false
        return Array.isArray(trends) ? trends : []
      } catch (error) {
        this.logger.warn(`Gemini API attempt ${attempt}/${maxRetries} failed:`, error.message)

        if (attempt === maxRetries) {
          this.logger.error('All Gemini API attempts failed, opening circuit breaker')
          this.circuitBreakerOpen = true
          this.circuitBreakerResetTime = Date.now() + this.circuitBreakerTimeout
          return this.getFallbackTrendAnalysis(posts)
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt))
      }
    }

    return []
  }

  private async analyzeProblemsWithGemini(posts: RedditPost[], limit = 500): Promise<ProblemAnalysis[]> {
    // Check circuit breaker
    if (this.circuitBreakerOpen && Date.now() < this.circuitBreakerResetTime) {
      this.logger.warn('Circuit breaker is open, using fallback analysis for problems')
      return this.getFallbackProblemAnalysis(posts)
    }

    const maxRetries = 3
    const retryDelay = 2000 // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.aiModel })

        // Prepare data for analysis (limit to avoid token limits)
        const postsData = posts.slice(0, limit).map((post) => ({
          title: post.title,
          subreddit: post.subreddit,
          score: post.score,
          comments: post.num_comments,
          selftext: post.selftext?.substring(0, 300) || '',
        }))

        console.log('postsData problems ==> ', postsData.length)

        const prompt = `
Analyze the following Reddit posts to identify specific problems people are facing that could be solved with SaaS products.

Posts data:
${JSON.stringify(postsData, null, 2)}

Return problems in the following JSON format:
[
  {
    "problem": "Clear description of the problem",
    "frequency": 15,
    "severity": "High/Medium/Low",
    "potentialSolutions": ["Solution 1", "Solution 2"],
    "marketSize": "Small/Medium/Large",
    "urgency": "High/Medium/Low"
  }
]

Focus on:
1. Recurring problems mentioned across multiple posts
2. Workflow inefficiencies
3. Manual processes that could be automated
4. Data management issues
5. Communication or collaboration problems
6. Time-consuming tasks that could be optimized

Return only valid JSON, no additional text.
`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        const jsonString = text.replace(/^```json\s*|```$/g, '')

        const problems = JSON.parse(jsonString)

        // Reset circuit breaker on success
        this.circuitBreakerOpen = false
        return Array.isArray(problems) ? problems : []
      } catch (error) {
        this.logger.warn(`Gemini API attempt ${attempt}/${maxRetries} failed for problems:`, error.message)

        if (attempt === maxRetries) {
          this.logger.error('All Gemini API attempts failed for problems, opening circuit breaker')
          this.circuitBreakerOpen = true
          this.circuitBreakerResetTime = Date.now() + this.circuitBreakerTimeout
          return this.getFallbackProblemAnalysis(posts)
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt))
      }
    }

    return []
  }

  async generateReport(days: number = 30): Promise<string> {
    this.logger.log(`Generating comprehensive report for the last ${days} days`)

    try {
      const [trends, problems] = await Promise.all([this.analyzeTrends(days), this.analyzeProblems(days)])

      let report = `\n=== TREND ANALYSIS REPORT (${days} days) ===\n\n`

      if (trends.length > 0) {
        report += '📈 EMERGING TRENDS:\n'
        trends.forEach((trend, index) => {
          report += `${index + 1}. ${trend.trend} (+${trend.growthPercentage}% over ${trend.timePeriod})\n`
          report += `   Market: ${trend.marketAnalysis}\n`
          report += `   Competition: ${trend.competitionLevel} | Entry Cost: ${trend.entryCost}\n`
          report += `   Recommendation: ${trend.recommendation}\n`
          report += `   Confidence: ${trend.confidence}%\n\n`
        })
      }

      if (problems.length > 0) {
        report += '🔍 IDENTIFIED PROBLEMS:\n'
        problems.forEach((problem, index) => {
          report += `${index + 1}. ${problem.problem}\n`
          report += `   Frequency: ${problem.frequency} mentions | Severity: ${problem.severity}\n`
          report += `   Market Size: ${problem.marketSize} | Urgency: ${problem.urgency}\n`
          report += `   Potential Solutions: ${problem.potentialSolutions.join(', ')}\n\n`
        })
      }

      if (trends.length === 0 && problems.length === 0) {
        report += 'No significant trends or problems identified in the current data.\n'
      }

      report += `\n=== END OF REPORT ===\n`

      return report
    } catch (error) {
      this.logger.error('Error generating report:', error)
      throw error
    }
  }

  private getFallbackTrendAnalysis(posts: RedditPost[]): TrendAnalysisResult[] {
    this.logger.log('Using fallback trend analysis due to API unavailability')

    // Basic trend analysis based on post data
    const subredditCounts = posts.reduce(
      (acc, post) => {
        acc[post.subreddit] = (acc[post.subreddit] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const topSubreddits = Object.entries(subredditCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

    const avgScore = posts.reduce((sum, post) => sum + post.score, 0) / posts.length
    const avgComments = posts.reduce((sum, post) => sum + post.num_comments, 0) / posts.length

    const trends: TrendAnalysisResult[] = []

    if (topSubreddits.length > 0) {
      trends.push({
        trend: `Growing activity in ${topSubreddits[0][0]} community`,
        growthPercentage: Math.round((topSubreddits[0][1] / posts.length) * 100),
        timePeriod: '30 days',
        marketAnalysis: `High engagement community with ${Math.round(avgScore)} avg score and ${Math.round(avgComments)} avg comments`,
        competitionLevel: 'Medium',
        entryCost: 'Low',
        recommendation: `Consider building tools for ${topSubreddits[0][0]} community needs`,
        confidence: 60,
      })
    }

    if (avgScore > 100) {
      trends.push({
        trend: 'High-engagement content trend',
        growthPercentage: Math.round((avgScore / 100) * 10),
        timePeriod: '30 days',
        marketAnalysis: 'Content with high engagement indicates strong community interest',
        competitionLevel: 'High',
        entryCost: 'Medium',
        recommendation: 'Focus on content creation and community management tools',
        confidence: 70,
      })
    }

    return trends
  }

  private getFallbackProblemAnalysis(posts: RedditPost[]): ProblemAnalysis[] {
    this.logger.log('Using fallback problem analysis due to API unavailability')

    // Basic problem analysis based on post content
    const problems: ProblemAnalysis[] = []

    // Analyze common keywords that might indicate problems
    const problemKeywords = [
      'problem',
      'issue',
      'difficult',
      'hard',
      'struggle',
      'frustrated',
      'annoying',
      'broken',
      'fix',
      'help',
    ]
    const problemPosts = posts.filter((post) =>
      problemKeywords.some(
        (keyword) =>
          post.title.toLowerCase().includes(keyword) || post.selftext?.toLowerCase().includes(keyword),
      ),
    )

    if (problemPosts.length > 0) {
      problems.push({
        problem: 'User-reported issues and difficulties',
        frequency: problemPosts.length,
        severity: problemPosts.length > 10 ? 'High' : 'Medium',
        potentialSolutions: ['User support tools', 'Automated troubleshooting', 'Community forums'],
        marketSize: 'Large',
        urgency: 'High',
      })
    }

    // Check for low engagement posts that might indicate problems
    const lowEngagementPosts = posts.filter((post) => post.score < 5 && post.num_comments < 3)
    if (lowEngagementPosts.length > posts.length * 0.3) {
      problems.push({
        problem: 'Low engagement content',
        frequency: lowEngagementPosts.length,
        severity: 'Medium',
        potentialSolutions: ['Content optimization tools', 'Engagement analytics', 'A/B testing platforms'],
        marketSize: 'Medium',
        urgency: 'Medium',
      })
    }

    return problems
  }
}
