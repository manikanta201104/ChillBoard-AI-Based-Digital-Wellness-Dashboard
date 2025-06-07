import express from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../index.js';
import User from '../models/user.js';
import { config } from '../config/env.js';

const router=express.Router();

router.post('/signup',async(req,res)=>{
    const {username,email,password}=req.body;
    try{
        const existingUser=await User.findOne({email});
        if(existingUser){
            logger.warm('Signup failed: email already exists',{email});
            return res.status(400).json({message:'Email already exists'});
        }
        const user=new User({
            userId:`user_${Date.now()}`,
            username,
            email,
            password,
            spotifyToken:null,
            preferences:{},
        });

        await user.save();

        const token=jwt.sign({userId:user._id},config.jwtSecret,{expiresIn:'1h'});
        logger.info('User signup successfully',{email});
        res.status(201).json({token});

    }catch(error){
        logger.error('Error during signup:',error);
        throw error;
    }
});

router.post('/login',async(req,res)=>{
    const{email,password}=req.body;
    try{
        const user=await User.findOne({email});
        if(!user){
            logger.warn("Login failed: User not found",{email});
            return res.status(404).json('message:Invalid credentials');
        }

        const isMatch=await user.comparePassword(password);
        if(!isMatch){
            logger.warn('Login failed: Invalid credentials',{email});
            return res.status(404).json('message:Invalid credentials');
        }

        const token=jwt.sign({userId:user._id},config.jwtSecret,{expiresIn:'1h'});
        logger.info('User login successfully',{email});
        res.status(200).json({token});
    }catch(error){
        logger.error('Error during login:',error);
        throw error;
    }
});

export default router;