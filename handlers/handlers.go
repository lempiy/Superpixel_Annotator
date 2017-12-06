package handlers

import (
	"github.com/labstack/echo"
)

//Run - inits and fills app router with handlers.
func Run(r *echo.Router) {
	r.Add(echo.POST, "/upload", Upload)
	r.Add(echo.POST, "/save", Save)
}