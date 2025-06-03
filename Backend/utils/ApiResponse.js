class ApiResponse {
  constructor(data, message='success', statusCode) {
    this.data = data;//The data property contains the response data. It can be any type of data, such as an object, array, or string.
    this.message = message;//The message property contains a descriptive message about the response. It is typically used to provide additional context or information about the response.
    this.statusCode = statusCode;//The statusCode property contains the HTTP status code of the response. It indicates the success or failure of the request.
    this.success = statusCode < 400;//The success property is a boolean value that indicates whether the response was successful. It is determined based on the status code of the response.
  }
}
export default ApiResponse;

//Ensures all API responses have a consistent format by encapsulating the response data, message, and status code in a single object. This makes it easier to handle responses in the client application and ensures a consistent user experience.

//The ApiResponse class is a utility class that encapsulates the response data, message, and status code in a single object. This ensures that all API responses have a consistent format, making it easier to handle responses in the client application. The ApiResponse class provides a convenient way to create and return API responses with a standardized structure.

//The ApiResponse class is typically used in Express route handlers to create and return API responses. For example:
// import ApiResponse from "../utils/ApiResponse";
//
// router.get("/", async (req, res) => {
//     const data = await fetchData();
//     const response = new ApiResponse(data, "Data fetched successfully", 200);
//     res.json(response);
// });

//In this example, the ApiResponse class is used to create an API response with the fetched data, a success message, and a status code of 200. The response object is then sent back to the client using the res.json() method. This ensures that the API response has a consistent format and provides a standardized way to handle responses in the client application.
//Overall, the ApiResponse class is a useful utility for creating and returning API responses with a consistent structure. By encapsulating the response data, message, and status code in a single object, the ApiResponse class helps to ensure a consistent user experience and makes it easier to handle responses in the client application.
