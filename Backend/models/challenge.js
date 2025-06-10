import mongoose from "mongoose";

const challengeSchema=new mongoose.Schema({
    challengeId:{
        type:String,
        required:true,
        unique:true
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true
    },
    duration:{
        type:Number,
        required:true,
    },
    goal:{
        type:String,
        required:true
    },
    startDate:{
        type:Date,
        required:true,
    },
    participants:[
        {
            type:String
        }
    ],
},{timestamps:true});

challengeSchema.index({startDate:-1});

export default mongoose.model('Challenge',challengeSchema);