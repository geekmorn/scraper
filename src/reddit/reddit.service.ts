import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { RedditPostRepository } from '../repositories/reddit-post.repository'

export interface RedditPost {
  id: string
  title: string
  author: string
  subreddit: string
  score: number
  num_comments: number
  created_utc: number
  reddit_url: string // Ссылка на пост в Reddit
  external_url?: string // Внешняя ссылка (если есть)
  selftext?: string
}

export interface RedditSearchResponse {
  posts: RedditPost[]
  total: number
  after?: string
}

@Injectable()
export class RedditService {
  private readonly logger = new Logger(RedditService.name)
  private readonly axiosInstance: AxiosInstance
  private lastRequestTime = 0
  private readonly requestDelay = 1000 // 1 секунда задержки

  constructor(
    private configService: ConfigService,
    private redditPostRepository: RedditPostRepository,
  ) {
    this.axiosInstance = axios.create({
      baseURL: 'https://oauth.reddit.com',
      headers: {
        'User-Agent': 'NestJS Reddit Parser/1.0',
      },
    })

    this.setupAuth()
  }

  private async setupAuth(): Promise<void> {
    try {
      const clientId = this.configService.get<string>('REDDIT_KEY')
      const clientSecret = this.configService.get<string>('REDDIT_SECRET')

      if (!clientId || !clientSecret) {
        throw new Error('Reddit API credentials not found in environment variables')
      }

      const authResponse = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'User-Agent': 'NestJS Reddit Parser/1.0',
          },
        },
      )

      const accessToken = authResponse.data.access_token
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

      this.logger.log('Reddit API authentication successful')
    } catch (error) {
      this.logger.error('Failed to authenticate with Reddit API', error)
      throw error
    }
  }

  private async ensureRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest
      this.logger.debug(`Rate limiting: waiting ${waitTime}ms`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }

  async searchPosts(query: string, subreddit?: string, limit: number = 25): Promise<RedditSearchResponse> {
    await this.ensureRateLimit()

    try {
      this.logger.log(`Searching Reddit for: "${query}"${subreddit ? ` in r/${subreddit}` : ''}`)

      let searchUrl = '/search.json'
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        sort: 'relevance',
        t: 'all',
      })

      if (subreddit) {
        searchUrl = `/r/${subreddit}/search.json`
      }

      const response = await this.axiosInstance.get(`${searchUrl}?${params.toString()}`)

      const posts: RedditPost[] = response.data.data.children.map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        author: child.data.author,
        subreddit: child.data.subreddit,
        score: child.data.score,
        num_comments: child.data.num_comments,
        created_utc: child.data.created_utc,
        reddit_url: `https://reddit.com${child.data.permalink}`,
        external_url:
          child.data.url !== `https://reddit.com${child.data.permalink}` ? child.data.url : undefined,
        selftext: child.data.selftext || '',
      }))

      this.logger.log(`Found ${posts.length} posts for query: "${query}"`)

      return {
        posts,
        total: posts.length,
        after: response.data.data.after,
      }
    } catch (error) {
      this.logger.error(`Error searching Reddit for "${query}":`, error)
      throw error
    }
  }

  async getSubredditPosts(
    subreddit: string,
    limit: number = 25,
    sort: 'hot' | 'new' | 'top' = 'hot',
  ): Promise<RedditSearchResponse> {
    await this.ensureRateLimit()

    try {
      this.logger.log(`Fetching ${sort} posts from r/${subreddit}`)

      const response = await this.axiosInstance.get(`/r/${subreddit}/${sort}.json`, {
        params: { limit },
      })

      const posts: RedditPost[] = response.data.data.children.map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        author: child.data.author,
        subreddit: child.data.subreddit,
        score: child.data.score,
        num_comments: child.data.num_comments,
        created_utc: child.data.created_utc,
        reddit_url: `https://reddit.com${child.data.permalink}`,
        external_url:
          child.data.url !== `https://reddit.com${child.data.permalink}` ? child.data.url : undefined,
        selftext: child.data.selftext || '',
      }))

      this.logger.log(`Found ${posts.length} posts from r/${subreddit}`)

      return {
        posts,
        total: posts.length,
        after: response.data.data.after,
      }
    } catch (error) {
      this.logger.error(`Error fetching posts from r/${subreddit}:`, error)
      throw error
    }
  }

  async searchAllPosts(
    query: string,
    subreddit?: string,
    maxResults: number = 1000,
  ): Promise<RedditSearchResponse> {
    this.logger.log(
      `Starting comprehensive search for: "${query}"${subreddit ? ` in r/${subreddit}` : ''} (max: ${maxResults})`,
    )

    const allPosts: RedditPost[] = []
    let after: string | undefined
    let totalRequests = 0
    const maxRequests = Math.ceil(maxResults / 100) // Reddit API максимум 100 постов за запрос

    while (allPosts.length < maxResults && totalRequests < maxRequests) {
      await this.ensureRateLimit()

      try {
        let searchUrl = '/search.json'
        const params = new URLSearchParams({
          q: query,
          limit: '100', // Максимальный лимит за запрос
          sort: 'relevance',
          t: 'all',
        })

        if (after) {
          params.append('after', after)
        }

        if (subreddit) {
          searchUrl = `/r/${subreddit}/search.json`
        }

        this.logger.debug(`Fetching batch ${totalRequests + 1}, after: ${after || 'none'}`)

        const response = await this.axiosInstance.get(`${searchUrl}?${params.toString()}`)
        const batchPosts: RedditPost[] = response.data.data.children.map((child: any) => ({
          id: child.data.id,
          title: child.data.title,
          author: child.data.author,
          subreddit: child.data.subreddit,
          score: child.data.score,
          num_comments: child.data.num_comments,
          created_utc: child.data.created_utc,
          reddit_url: `https://reddit.com${child.data.permalink}`,
          external_url:
            child.data.url !== `https://reddit.com${child.data.permalink}` ? child.data.url : undefined,
          selftext: child.data.selftext || '',
        }))

        allPosts.push(...batchPosts)
        after = response.data.data.after
        totalRequests++

        this.logger.debug(
          `Batch ${totalRequests}: found ${batchPosts.length} posts, total: ${allPosts.length}`,
        )

        // Если нет больше результатов, прерываем цикл
        if (!after || batchPosts.length === 0) {
          this.logger.log('No more results available')
          break
        }

        // Если достигли лимита, обрезаем результаты
        if (allPosts.length >= maxResults) {
          allPosts.splice(maxResults)
          this.logger.log(`Reached maximum results limit: ${maxResults}`)
          break
        }
      } catch (error) {
        this.logger.error(`Error in batch ${totalRequests + 1}:`, error)
        throw error
      }
    }

    this.logger.log(
      `Comprehensive search completed: found ${allPosts.length} posts in ${totalRequests} requests`,
    )

    return {
      posts: allPosts,
      total: allPosts.length,
      after,
    }
  }

  async getAllSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' = 'hot',
    maxResults: number = 1000,
  ): Promise<RedditSearchResponse> {
    this.logger.log(`Starting comprehensive fetch from r/${subreddit} (${sort}, max: ${maxResults})`)

    const allPosts: RedditPost[] = []
    let after: string | undefined
    let totalRequests = 0
    const maxRequests = Math.ceil(maxResults / 100)

    while (allPosts.length < maxResults && totalRequests < maxRequests) {
      await this.ensureRateLimit()

      try {
        const params: any = { limit: '100' }
        if (after) {
          params.after = after
        }

        this.logger.debug(
          `Fetching batch ${totalRequests + 1} from r/${subreddit}, after: ${after || 'none'}`,
        )

        const response = await this.axiosInstance.get(`/r/${subreddit}/${sort}.json`, { params })
        const batchPosts: RedditPost[] = response.data.data.children.map((child: any) => ({
          id: child.data.id,
          title: child.data.title,
          author: child.data.author,
          subreddit: child.data.subreddit,
          score: child.data.score,
          num_comments: child.data.num_comments,
          created_utc: child.data.created_utc,
          reddit_url: `https://reddit.com${child.data.permalink}`,
          external_url:
            child.data.url !== `https://reddit.com${child.data.permalink}` ? child.data.url : undefined,
          selftext: child.data.selftext || '',
        }))

        allPosts.push(...batchPosts)
        after = response.data.data.after
        totalRequests++

        this.logger.debug(
          `Batch ${totalRequests}: found ${batchPosts.length} posts, total: ${allPosts.length}`,
        )

        if (!after || batchPosts.length === 0) {
          this.logger.log('No more results available')
          break
        }

        if (allPosts.length >= maxResults) {
          allPosts.splice(maxResults)
          this.logger.log(`Reached maximum results limit: ${maxResults}`)
          break
        }
      } catch (error) {
        this.logger.error(`Error in batch ${totalRequests + 1}:`, error)
        throw error
      }
    }

    this.logger.log(
      `Comprehensive fetch completed: found ${allPosts.length} posts in ${totalRequests} requests`,
    )

    return {
      posts: allPosts,
      total: allPosts.length,
      after,
    }
  }

  async savePostsToDatabase(posts: RedditPost[]): Promise<{ saved: number; skipped: number }> {
    this.logger.log(`Saving ${posts.length} posts to database`)

    try {
      const result = await this.redditPostRepository.createMany(posts)
      this.logger.log(`Saved ${result.created} new posts, skipped ${result.skipped} duplicates`)
      return { saved: result.created, skipped: result.skipped }
    } catch (error) {
      this.logger.error('Error saving posts to database:', error)
      throw error
    }
  }

  async upsertPostsToDatabase(posts: RedditPost[]): Promise<{ upserted: number; modified: number }> {
    this.logger.log(`Upserting ${posts.length} posts to database`)

    try {
      const result = await this.redditPostRepository.upsertMany(posts)
      this.logger.log(`Upserted ${result.upserted} new posts, modified ${result.modified} existing posts`)
      return result
    } catch (error) {
      this.logger.error('Error upserting posts to database:', error)
      throw error
    }
  }

  async searchAndSavePosts(
    query: string,
    subreddit?: string,
    maxResults: number = 1000,
    saveToDatabase: boolean = true,
  ): Promise<RedditSearchResponse & { databaseResult?: { saved: number; skipped: number } }> {
    const searchResult = await this.searchAllPosts(query, subreddit, maxResults)

    if (saveToDatabase && searchResult.posts.length > 0) {
      const dbResult = await this.savePostsToDatabase(searchResult.posts)
      return {
        ...searchResult,
        databaseResult: dbResult,
      }
    }

    return searchResult
  }

  async getSubredditAndSavePosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' = 'hot',
    maxResults: number = 1000,
    saveToDatabase: boolean = true,
  ): Promise<RedditSearchResponse & { databaseResult?: { saved: number; skipped: number } }> {
    const searchResult = await this.getAllSubredditPosts(subreddit, sort, maxResults)

    if (saveToDatabase && searchResult.posts.length > 0) {
      const dbResult = await this.savePostsToDatabase(searchResult.posts)
      return {
        ...searchResult,
        databaseResult: dbResult,
      }
    }

    return searchResult
  }

  async getPostsFromDatabase(limit: number = 100, skip: number = 0): Promise<RedditPost[]> {
    return await this.redditPostRepository.findAll(limit, skip)
  }

  async getPostsBySubredditFromDatabase(
    subreddit: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<RedditPost[]> {
    return await this.redditPostRepository.findBySubreddit(subreddit, limit, skip)
  }

  async searchPostsInDatabase(query: string, limit: number = 100, skip: number = 0): Promise<RedditPost[]> {
    return await this.redditPostRepository.searchPosts(query, limit, skip)
  }

  async getDatabaseStats(): Promise<{ total: number; bySubreddit: Record<string, number> }> {
    const total = await this.redditPostRepository.count()
    // Для получения статистики по сабреддитам можно добавить отдельный метод в репозиторий
    return { total, bySubreddit: {} }
  }
}
