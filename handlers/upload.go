package handlers

import (
	"os"
	"io"
	"net/http"
	"github.com/labstack/echo"
	"github.com/DragonTailSystems/AnnotationTool.v.2/tools"
	"fmt"
	"strings"
	"strconv"
)

func Upload(c echo.Context) error {

	//-----------
	// Read file
	//-----------

	// Source
	form, err := c.MultipartForm()
	if err != nil {
		fmt.Println(err)
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"info": "No multipart boundary param in Content-Type.",
		})
	}
	images, ok := form.File["image"]
	if !ok {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"info": "No image found.",
		})
	}
	size, err := strconv.Atoi(c.FormValue("size"))
	if err != nil {
		return err
	}
	compactness, err := strconv.ParseFloat(c.FormValue("compactness"), 64)
	if err != nil {
		return err
	}
	iterations, err := strconv.Atoi(c.FormValue("iterations"))
	if err != nil {
		return err
	}

	fmt.Println(size, compactness, iterations)

	file := images[0]
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	// Destination

	arr := strings.Split(file.Filename, ".")
	name := strings.Join(arr[:len(arr)-1], "")
	dst, err := os.Create("images/"+file.Filename)

	if err != nil {
		return err
	}

	// Copy
	if _, err = io.Copy(dst, src); err != nil {
		return err
	}
	dst.Close()

	_, err = tools.RunSLIC(
		"images/"+file.Filename,
		"images/"+name+"_slic.png",
		size, compactness, iterations)

	if err != nil {
		fmt.Println(err)
		return c.JSON(http.StatusOK,  map[string]bool{
			"success": false,
		})
	}

	return c.JSON(http.StatusOK,  map[string]interface{}{
		"success": true,
		"image": "images/"+file.Filename,
		"image_net": "images/"+name+"_slic.png",
		"name": name,
	})
}

func Save(c echo.Context) error {

	//-----------
	// Read file
	//-----------

	// Source
	form, err := c.MultipartForm()
	if err != nil {
		fmt.Println(err)
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"info": "No multipart boundary param in Content-Type.",
		})
	}
	images, ok := form.File["image"]
	if !ok {
		c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"info": "No image found.",
		})
	}

	file := images[0]
	src, err := file.Open()

	if err != nil {
		return err
	}

	defer src.Close()

	// Destination


	dst, err := os.Create("images/"+file.Filename)

	if err != nil {
		return err
	}

	// Copy
	if _, err = io.Copy(dst, src); err != nil {
		return err
	}

	if err != nil {
		return err
	}

	dst.Close()

	return c.JSON(http.StatusOK,  map[string]bool{
		"success": true,
	})
}
