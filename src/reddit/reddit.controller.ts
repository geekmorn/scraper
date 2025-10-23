import { Controller, Get, Query, Logger } from '@nestjs/common'
import { RedditService, RedditSearchResponse } from './reddit.service'

@Controller('reddit')
export class RedditController {
  private readonly logger = new Logger(RedditController.name)

  constructor(private readonly redditService: RedditService) {}

  @Get('search')
  async searchPosts(
    @Query('q') query: string,
    @Query('subreddit') subreddit?: string,
    @Query('limit') limit = 10,
  ): Promise<RedditSearchResponse> {
    this.logger.log(`Search request: query="${query}", subreddit="${subreddit}", limit="${limit}"`)

    if (!query) {
      throw new Error('Query parameter "q" is required')
    }
    if (limit > 100) {
      throw new Error('Limit cannot exceed 100')
    }

    return this.redditService.searchPosts(query, subreddit, limit)
  }

  @Get('subreddit')
  async getSubredditPosts(
    @Query('subreddit') subreddit: string,
    @Query('sort') sort?: 'hot' | 'new' | 'top',
    @Query('limit') limit?: string,
  ): Promise<RedditSearchResponse> {
    this.logger.log(`Subreddit request: subreddit="${subreddit}", sort="${sort}", limit="${limit}"`)

    if (!subreddit) {
      throw new Error('Subreddit parameter is required')
    }

    const limitNumber = limit ? parseInt(limit, 10) : 25

    if (limitNumber > 100) {
      throw new Error('Limit cannot exceed 100')
    }

    return this.redditService.getSubredditPosts(subreddit, limitNumber, sort || 'hot')
  }

  @Get('search-all')
  async searchAllPosts(
    @Query('q') query: string,
    @Query('subreddit') subreddit?: string,
    @Query('max') maxResults?: string,
  ): Promise<RedditSearchResponse> {
    this.logger.log(
      `Comprehensive search request: query="${query}", subreddit="${subreddit}", max="${maxResults}"`,
    )

    if (!query) {
      throw new Error('Query parameter "q" is required')
    }

    const maxResultsNumber = maxResults ? parseInt(maxResults, 10) : 1000

    if (maxResultsNumber > 10000) {
      throw new Error('Max results cannot exceed 10000')
    }

    if (maxResultsNumber < 1) {
      throw new Error('Max results must be at least 1')
    }

    return this.redditService.searchAllPosts(query, subreddit, maxResultsNumber)
  }

  @Get('subreddit-all')
  async getAllSubredditPosts(
    @Query('subreddit') subreddit: string,
    @Query('sort') sort?: 'hot' | 'new' | 'top',
    @Query('max') maxResults?: string,
  ): Promise<RedditSearchResponse> {
    this.logger.log(
      `Comprehensive subreddit request: subreddit="${subreddit}", sort="${sort}", max="${maxResults}"`,
    )

    if (!subreddit) {
      throw new Error('Subreddit parameter is required')
    }

    const maxResultsNumber = maxResults ? parseInt(maxResults, 10) : 1000

    if (maxResultsNumber > 10000) {
      throw new Error('Max results cannot exceed 10000')
    }

    if (maxResultsNumber < 1) {
      throw new Error('Max results must be at least 1')
    }

    return this.redditService.getAllSubredditPosts(subreddit, sort || 'hot', maxResultsNumber)
  }

  @Get('search-and-save')
  async searchAndSavePosts(
    @Query('q') query: string,
    @Query('subreddit') subreddit?: string,
    @Query('max') maxResults?: string,
    @Query('save') saveToDatabase?: string,
  ) {
    this.logger.log(
      `Search and save request: query="${query}", subreddit="${subreddit}", max="${maxResults}", save="${saveToDatabase}"`,
    )

    if (!query) {
      throw new Error('Query parameter "q" is required')
    }

    const maxResultsNumber = maxResults ? parseInt(maxResults, 10) : 1000
    const shouldSave = saveToDatabase !== 'false'

    if (maxResultsNumber > 10000) {
      throw new Error('Max results cannot exceed 10000')
    }

    if (maxResultsNumber < 1) {
      throw new Error('Max results must be at least 1')
    }

    return this.redditService.searchAndSavePosts(query, subreddit, maxResultsNumber, shouldSave)
  }

  @Get('subreddit-and-save')
  async getSubredditAndSavePosts(
    @Query('subreddit') subreddit: string,
    @Query('sort') sort?: 'hot' | 'new' | 'top',
    @Query('max') maxResults?: string,
    @Query('save') saveToDatabase?: string,
  ) {
    this.logger.log(
      `Subreddit and save request: subreddit="${subreddit}", sort="${sort}", max="${maxResults}", save="${saveToDatabase}"`,
    )

    if (!subreddit) {
      throw new Error('Subreddit parameter is required')
    }

    const maxResultsNumber = maxResults ? parseInt(maxResults, 10) : 1000
    const shouldSave = saveToDatabase !== 'false'

    if (maxResultsNumber > 10000) {
      throw new Error('Max results cannot exceed 10000')
    }

    if (maxResultsNumber < 1) {
      throw new Error('Max results must be at least 1')
    }

    return this.redditService.getSubredditAndSavePosts(subreddit, sort || 'hot', maxResultsNumber, shouldSave)
  }

  @Get('database/posts')
  async getPostsFromDatabase(@Query('limit') limit?: string, @Query('skip') skip?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 100
    const skipNumber = skip ? parseInt(skip, 10) : 0

    if (limitNumber > 1000) {
      throw new Error('Limit cannot exceed 1000')
    }

    return this.redditService.getPostsFromDatabase(limitNumber, skipNumber)
  }

  @Get('database/subreddit')
  async getPostsBySubredditFromDatabase(
    @Query('subreddit') subreddit: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    if (!subreddit) {
      throw new Error('Subreddit parameter is required')
    }

    const limitNumber = limit ? parseInt(limit, 10) : 100
    const skipNumber = skip ? parseInt(skip, 10) : 0

    if (limitNumber > 1000) {
      throw new Error('Limit cannot exceed 1000')
    }

    return this.redditService.getPostsBySubredditFromDatabase(subreddit, limitNumber, skipNumber)
  }

  @Get('database/search')
  async searchPostsInDatabase(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    if (!query) {
      throw new Error('Query parameter "q" is required')
    }

    const limitNumber = limit ? parseInt(limit, 10) : 100
    const skipNumber = skip ? parseInt(skip, 10) : 0

    if (limitNumber > 1000) {
      throw new Error('Limit cannot exceed 1000')
    }

    return this.redditService.searchPostsInDatabase(query, limitNumber, skipNumber)
  }

  @Get('database/stats')
  async getDatabaseStats() {
    return this.redditService.getDatabaseStats()
  }
}
