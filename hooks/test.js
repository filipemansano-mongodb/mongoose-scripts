import mongoose from 'mongoose';
import { expect } from 'chai';
import { User, Post } from './schema.js';
import { Log } from './logging-fn.js';

mongoose.connect(process.env.MONGO_URL);

const delay = (ms)  =>{
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Post Schema Tests', function () {
    let userId;
    this.timeout(10000);

    before(async function () {
        // Limpar as coleções antes dos testes
        await User.deleteMany({});
        await Log.deleteMany({});
        await Post.deleteMany({});

        // Cria um user default para os testes
        const user = new User({ name: 'Test User', email: 'test@example.com' });
        const savedUser = await user.save();
        userId = savedUser._id;
    });

    it('should populate author details in a post before saving', async function () {
        
        const post = new Post({
            title: 'Test Post',
            content: 'This is a test post',
            author: { id: userId }
        });

        const postSaved = await post.save();

        expect(postSaved.author.name).to.equal('Test User');
        expect(postSaved.author.email).to.equal('test@example.com');
    });

    it('should populate log data before saving', async function () {
       
        const newPost = await new Post({title: 'New Post'}).save();

        newPost.title = 'New Post [edited]';
        await newPost.save();

        const log = await Log.findOne({collectionName: 'posts', documentId: newPost.id});

        expect(log.oldData.title).to.equal('New Post');
        expect(log.newData.title).to.equal('New Post [edited]');
    });

    it('should populate log data after saving (changeStream)', async function () {
       
        const user = await User.findById(userId).select('name');

        user.name = 'New Name';
        await user.save();

        // rodar o change-stream.js antes de executar os testes
        await delay(500);
        const log = await Log.findOne({collectionName: 'users', documentId: user.id}).sort({createdAt: -1});

        expect(log.oldData.name).to.equal('Test User');
        expect(log.newData.name).to.equal('New Name');
    });

    after(async function () {
        mongoose.connection.close();
    });
});