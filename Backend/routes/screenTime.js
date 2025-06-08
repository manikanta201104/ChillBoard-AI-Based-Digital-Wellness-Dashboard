import express from 'express';
import { logger } from '../index.js';
import ScreenTime from '../models/screenTime.js';
import { authMiddleware } from '../middleware/auth.js';

const router=express.Router();

router.post('/',authMiddleware,async(req,res)=>{
    const{totalTime,tabs}=req.body;
    const userId=req.user.userId;

    try{
        const screenTime=new ScreenTime({
            screenTimeId:`st_${Date.now()}`,
            userId,
            date:new Date(),
            totalTime,
            tabs,
        });

        await screenTime.save();
        logger.info('Screen time data saved',{userId, totalTime});
        res.status(201).json({message:'Screen time data saved'});
    }catch(error){
        logger.error('Error saving screen time:',error);
        throw error;
    }
});

export default router;