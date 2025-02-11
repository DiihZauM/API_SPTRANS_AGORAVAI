const urlencoded = new URLSearchParams();

const requestOptions = {
  method: "POST",
  credentials: "include"
  
};

fetch(, requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));