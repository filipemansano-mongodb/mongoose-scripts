import mongoose from 'mongoose';
import { Log } from './hooks/logging-fn.js';
let resumeAfter = undefined;

async function monitorChanges() {
    const db = mongoose.connection.db;

    const changeStream = db.watch([
        {
            $match: {
                'ns.coll': { $ne: 'logs' },
                'operationType': { $in: ['update', 'delete'] }
            }
        }
    ], { 
        resumeAfter: resumeAfter,
        fullDocumentBeforeChange: 'whenAvailable' 
    });

    console.log('ChangeStream Connected');

    for await (const change of changeStream) {
        console.log(change);

        /**
         * Necessário habilitar o Pre-image na collection caso queira salvar o valor antigo
         * db.runCommand( { collMod: "users", changeStreamPreAndPostImages: { enabled: true } }  )
         */
        let oldData = null;
        let newData = change.updateDescription?.updatedFields;
        
        if(change.operationType === 'delete' && change.fullDocumentBeforeChange){
            oldData = change.fullDocumentBeforeChange;
        }

        if(change.operationType === 'update'){
            oldData = {};

            if(change.fullDocumentBeforeChange){
                for(const key in change.updateDescription.updatedFields){
                    oldData[key] = change.fullDocumentBeforeChange[key];
                }
            }
        }

        const logEntry = {
            documentId: change.documentKey._id,
            collectionName: change.ns.coll,
            operationType: change.operationType,
            source: 'ChangeStreams',
            oldData: oldData,
            newData: newData,
            createdAt: new Date()
        };

        await new Log(logEntry).save();
    }

    resumeAfter = changeStream.resumeToken;
    await changeStream.close();
    console.log('ChangeStream Closed');
}

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        monitorChanges();
    })
    .catch(err => console.error(err))
