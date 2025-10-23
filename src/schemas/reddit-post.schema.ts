import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type RedditPostDocument = RedditPost & Document

@Schema({
  timestamps: true,
  collection: 'reddit_posts',
})
export class RedditPost {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  id: string

  @Prop({ type: String, required: true })
  title: string

  @Prop({ type: String, required: true })
  author: string

  @Prop({ type: String, required: true })
  subreddit: string

  @Prop({ type: Number, required: true })
  score: number

  @Prop({ type: Number, required: true })
  num_comments: number

  @Prop({ type: Number, required: true })
  created_utc: number

  @Prop({ type: String, required: true })
  reddit_url: string

  @Prop({ type: String })
  external_url?: string

  @Prop({ type: String, default: '' })
  selftext: string
}

export const RedditPostSchema = SchemaFactory.createForClass(RedditPost)
