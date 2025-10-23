import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { RedditController } from './reddit.controller'
import { RedditService } from './reddit.service'
import { RedditPost, RedditPostSchema } from '../schemas/reddit-post.schema'
import { RedditPostRepository } from '../repositories/reddit-post.repository'

@Module({
  imports: [ConfigModule, MongooseModule.forFeature([{ name: RedditPost.name, schema: RedditPostSchema }])],
  controllers: [RedditController],
  providers: [RedditService, RedditPostRepository],
  exports: [RedditService, RedditPostRepository],
})
export class RedditModule {}
