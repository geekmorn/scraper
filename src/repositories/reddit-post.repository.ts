import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { RedditPost, RedditPostDocument } from '../schemas/reddit-post.schema'

@Injectable()
export class RedditPostRepository {
  constructor(@InjectModel(RedditPost.name) private redditPostModel: Model<RedditPostDocument>) {}

  async create(postData: Partial<RedditPost>): Promise<RedditPost> {
    try {
      const newPost = new this.redditPostModel(postData)
      return await newPost.save()
    } catch (error) {
      if (error.code === 11000) {
        // Дубликат по id - пост уже существует
        throw new Error(`Post with id ${postData.id} already exists`)
      }
      throw error
    }
  }

  async createMany(postsData: Partial<RedditPost>[]): Promise<{ created: number; skipped: number }> {
    let created = 0
    let skipped = 0

    for (const postData of postsData) {
      try {
        await this.create(postData)
        created++
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipped++
        } else {
          throw error
        }
      }
    }

    return { created, skipped }
  }

  async upsert(postData: Partial<RedditPost>): Promise<RedditPost> {
    return await this.redditPostModel.findOneAndUpdate({ id: postData.id }, postData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    })
  }

  async upsertMany(postsData: Partial<RedditPost>[]): Promise<{ upserted: number; modified: number }> {
    const bulkOps = postsData.map((postData) => ({
      updateOne: {
        filter: { id: postData.id },
        update: { $set: postData },
        upsert: true,
      },
    }))

    const result = await this.redditPostModel.bulkWrite(bulkOps)
    return {
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    }
  }

  async findById(id: string): Promise<RedditPost | null> {
    return await this.redditPostModel.findOne({ id }).exec()
  }

  async findAll(limit: number = 100, skip: number = 0): Promise<RedditPost[]> {
    return await this.redditPostModel.find().sort({ created_utc: -1 }).limit(limit).skip(skip).exec()
  }

  async findBySubreddit(subreddit: string, limit: number = 100, skip: number = 0): Promise<RedditPost[]> {
    return await this.redditPostModel
      .find({ subreddit })
      .sort({ created_utc: -1 })
      .limit(limit)
      .skip(skip)
      .exec()
  }

  async searchPosts(query: string, limit: number = 100, skip: number = 0): Promise<RedditPost[]> {
    return await this.redditPostModel
      .find({
        $or: [{ title: { $regex: query, $options: 'i' } }, { selftext: { $regex: query, $options: 'i' } }],
      })
      .sort({ created_utc: -1 })
      .limit(limit)
      .skip(skip)
      .exec()
  }

  async count(): Promise<number> {
    return await this.redditPostModel.countDocuments().exec()
  }

  async countBySubreddit(subreddit: string): Promise<number> {
    return await this.redditPostModel.countDocuments({ subreddit }).exec()
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.redditPostModel.deleteOne({ id }).exec()
    return result.deletedCount > 0
  }

  async deleteOldPosts(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000)

    const result = await this.redditPostModel.deleteMany({ created_utc: { $lt: cutoffTimestamp } }).exec()

    return result.deletedCount
  }
}
