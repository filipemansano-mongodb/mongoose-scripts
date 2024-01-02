import mongoose, { Schema } from 'mongoose';

const LogSchema = new Schema({
    documentId: Schema.Types.ObjectId,
    collectionName: String,
    operationType: String,
    source: String,
    oldData: Schema.Types.Mixed,
    newData: Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});

const addLogging = (schema, collectionName) => {

    schema.post('init', function(doc){
        doc.$locals.initialState = new doc.constructor(doc);
        doc.$locals.changes = [];
    });

    schema.pre('save', function(next){
        if (this.isNew) { return next(); }
        let changes = {};
        for (const path of this.directModifiedPaths()) {
            changes[path] = this.$locals.initialState.get(path);
        }
        this.$locals.changes = changes;
        next();
    });

    schema.post('save', function() {
        if (this.isNew) { return }
        if (this.$locals.changes && Object.keys(this.$locals.changes).length > 0) {
            let newData = {}
            for (const path in this.$locals.changes) {
                newData[path] = this.get(path);
            }
            const logEntry = {
                documentId: this._id,
                collectionName,
                source: 'Mongoose Hooks',
                operationType: 'update',
                oldData: this.$locals.changes,
                newData: newData
            };

            new Log(logEntry).save();
        }

        this.$locals.initialState = new this.constructor(this);
    });

    schema.pre('remove', function (next) {
        const logEntry = {
            documentId: this._id,
            collectionName,
            source: 'Mongoose Hooks',
            operationType: 'delete',
            oldData: this.toObject()
        };

        new Log(logEntry).save();

        next();
    });
}
const Log = mongoose.model('Log', LogSchema);
export { Log, addLogging };