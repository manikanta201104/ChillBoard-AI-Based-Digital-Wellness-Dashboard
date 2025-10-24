import mongoose from "mongoose";

const contactMessageSchema=new mongoose.Schema({
    name:{type:String,required:true},
    email:{type:String,required:true},
    message:{type:String,required:true},
    // NEW: allow admin to track resolution state
    resolved:{type:Boolean,default:false}
},{timestamps:true});

export default mongoose.model('ContactMessage',contactMessageSchema);