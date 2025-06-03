class ApiError extends Error { 
  constructor(statusCode,//The statusCode property contains the HTTP status code of the response. It indicates the success or failure of the request.
     message="An error occurred",//
     errors=[],//The errors property contains an array of error messages. It is typically used to provide additional information about the error that occurred.
     stack=""//The stack property contains the stack trace of the error. It is used to identify the source of the error and debug issues in the code.
    ) {
    super(message);//The super() method calls the constructor of the parent class (Error) with the specified message. This initializes the error object with the given message.
    this.statusCode = statusCode;//
    this.message = message;
    this.errors = errors;
    this.data=null
    this.success=false
    if(stack){
      this.stack=stack
    }else{
      Error.captureStackTrace(this, this.constructor);//The Error.captureStackTrace() method is used to capture the stack trace of an error. It is typically used to identify the source of an error and debug issues in the code.
    }
  }
}

export default ApiError;

//The ApiError class extends the built-in Error class to create custom error objects with additional properties such as statusCode, errors, and data. This allows for more detailed error handling and response generation in Express applications.
//The ApiError class is typically used to create custom error objects in Express route handlers. For example:
// import ApiError from "../utils/ApiError";
//
// router.get("/", async (req, res, next) => {
//     try {
//         const data = await fetchData();
//         if (!data) {
//             throw new ApiError(404, "Data not found");
//         }
//         res.json(data);
//
//     } catch (error) {
//         next(error);
//     }
// });
//In this example, the ApiError class is used to create a custom error object with a status code of 404 and an error message of "Data not found". If the data is not found, the route handler throws an ApiError object, which is then passed to the next middleware for error handling.
//Overall, the ApiError class provides a convenient way to create custom error objects with additional properties for more detailed error handling in Express applications. By extending the Error class, the ApiError class allows developers to create custom error objects that can be used to generate consistent and informative error responses.
