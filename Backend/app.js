import express from "express";
const app=express();
import cors from "cors"; //Imports cors for enabling Cross-Origin Resource Sharing.This line imports the cors module, which is a middleware that enables Cross-Origin Resource Sharing (CORS). CORS is a security feature that allows or restricts resources on a web page to be requested from another domain outside the domain from which the resource originated.

import cookieParser from "cookie-parser"; //Imports cookieParser for handling cookies. This line imports the cookie-parser module, which is a middleware that parses cookies attached to the client request object. It makes it easier to work with cookies in your Express application.


app.use(cors({
    origin:process.env.CORS_ORIGIN,//This option specifies the origin that is allowed to access the server. In this case, it is set to the CLIENT_URL environment variable.
    credentials:true //This option allows the server to send cookies to the client.credentials: true enables cookies to be sent with cross-origin requests.This allows the server to accept credentials (like cookies, authorization headers, etc.) from the client. This is important if your front-end and back-end are on different domains and you need to maintain sessions or authentication.
}));
app.use(express.json());//This middleware parses incoming requests with JSON payloads. It limits the payload size to 5MB.
app.use(express.urlencoded({extended:true}));//This middleware parses incoming requests with URL-encoded payloads. It allows for nested objects in the URL-encoded data.
app.use(cookieParser());//This middleware parses cookies attached to the client request. It populates the req.cookies object with the parsed cookies.
app.use(express.static("public"));//This middleware serves static files from the public directory. It allows access to files in the public directory from the client side.


export default app;//Exports the app instance for use in other files.