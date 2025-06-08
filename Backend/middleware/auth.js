import jwt from 'jsonwebtoken';
import { logger } from '../index.js';
import { config } from '../config/env.js';

export const authMiddleware=(req,res,next)=>{
    const token = req.headers.authorization?.split(' ')[1];
    if(!token){
        logger.warn('No token provided');
        return res.status(401).json({message:'No token provided'});
    }
    try{
        const decoded=jwt.verify(token,config.jwtSecret);
        req.user=decoded;//{userId:<id>}
        next();
    }catch(error){
        logger.warn('Invalid token',{error:error.message});
        res.status(401).json({message:'Invalid token'});
    }
};