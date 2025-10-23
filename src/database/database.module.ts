import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule, ConfigService } from '@nestjs/config'
import databaseConfig from '../config/database.config'
import { RedditPost, RedditPostSchema } from '../schemas/reddit-post.schema'
import { RedditPostRepository } from '../repositories/reddit-post.repository'

@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: RedditPost.name, schema: RedditPostSchema }]),
  ],
  providers: [RedditPostRepository],
  exports: [RedditPostRepository],
})
export class DatabaseModule {}
