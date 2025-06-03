const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch(next);
    };
};

export { asyncHandler };

// Why Use asyncHandler?
// In Express, if an error occurs in an asynchronous route handler, it won't be automatically caught by Express's error-handling middleware unless you explicitly use a try-catch block or chain a .catch() to the Promise. The asyncHandler eliminates the need for repetitive try-catch blocks or .catch() chains, making your code cleaner and more concise.

//In Express, handling async errors requires a try-catch block for every route. This utility eliminates repetitive error handling. It wraps the route handler in a try-catch block and passes the error to the next middleware. This way, the error can be handled in a single place.


//The asyncHandler function takes a request handler as an argument and returns a new function that wraps the request handler in a try-catch block. If an error occurs, it calls the next middleware with the error. This way, the error handling is centralized and reusable across multiple routes.


//The asyncHandler function can be used as middleware in Express routes to handle async errors. For example:

// import asyncHandler from "../utils/asyncHandler";
//
// router.get("/", asyncHandler(async (req, res) => {
//     const videos = await Video.find();
//     res.json(videos);
// }));

//In this example, the asyncHandler function is used to wrap the route handler for a GET request. If an error occurs during the execution of the route handler, the error will be passed to the next middleware for error handling. This simplifies error handling in Express routes and makes the code more readable and maintainable.


//Overall, the asyncHandler utility simplifies error handling in Express routes by centralizing the error handling logic and making it reusable across multiple routes. This helps to improve code quality and maintainability in Express applications.


