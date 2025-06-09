import axios from "axios";
const api=axios.create({
    baseURL:"http://localhost:5000",
    headers:{
        'Content-Type':'application/json',
    },
});

export const signup=async (userData)=>{
    const response=await api.post('/auth/signup',userData);
    return response.data;
};

export const login=async (userData)=>{
    const response=await api.post('/auth/login',userData);
    return response.data;
};