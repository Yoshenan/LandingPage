import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
export function hashPassword(password) {
    const SALTROUNDS = 12;
    return bcrypt.hashSync(password, SALTROUNDS);
}
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    companyName: { type: String, required: true },
    role: { type: String, default: 'Admin' }
});
// 2. Log Schema & Model Definition (Now includes company & username tracking)
const logSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    company: String,
    environmentDetails: String,
    platForm: String,
    Req: String,
    num: String,
    organization: String,
    createdAt: { type: Date, default: Date.now },
    entry: { type: String },
    username: String,
    companyName: String,
});

const telegramSchema = new mongoose.Schema({
  client: String,
  organization: String,
  fullName: String,
  email: String,
  phone: String,
  environment: String,
  platformCategory: String,
  requestType: String,

  source: String,
  submittedAt: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});
export const User = mongoose.model('User', userSchema);
export const Log = mongoose.model('Log', logSchema);
export const Telegram = mongoose.model('Telegram', telegramSchema, 'telegrams');
// 4. Database Connection Function
export const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://SYSTEM:IvRoKoZhnNHdbrOk@cluster0.zwk0sb6.mongodb.net/?appName=Cluster0');
        console.log('Connection to mongo db successful');
    }
    catch (err) {
        console.error('DB Connection Error:', err);
    }
};
