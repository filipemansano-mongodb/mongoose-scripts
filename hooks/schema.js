import mongoose, { Schema } from 'mongoose';
import { addLogging } from './logging-fn.js';

const UserSchema = new Schema({
    name: String,
    email: String,
});

const PostSchema = new Schema({
    title: String,
    content: String,
    author: {
        id: Schema.Types.ObjectId,
        name: String,
        email: String
    },
});

PostSchema.pre('save', async function (next) {
    if (this.isNew || this.isModified('author.id')) {
        try {
            const user = await User.findById(this.author.id).select('name email');
            if (user) {
                this.author.name = user.name;
                this.author.email = user.email;
            }
        } catch (error) {
            next(error);
        }
    }
    next();
});

// usando hooks do mongoose para logar alterações
addLogging(PostSchema, 'posts');

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);

export { User, Post };