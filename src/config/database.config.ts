import { registerAs } from '@nestjs/config'

export default registerAs('database', () => ({
  uri: `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}:${process.env.MONGO_POST}`,
}))
