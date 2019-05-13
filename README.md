# PHANTOM CRAWLER SERVER

## Easy web-crawling using HTTP API server.

### INSTALL
```bash
npm i -g headless-browser
```

```bash
yarn global add headless-browser```

### USAGE
Execute command to run:
```bash
headless-browser
```

#### GET
Get a specific page
```text
METHOD: GET
URL: /get/:url
RESPONSE:
{
  status_code: 200,
  data: "<html></html>"
}
```

#### DOWNLOAD
Download the active page
```text
METHOD: GET
URL: /download
RESPONSE: content.html
```

#### DISPLAY
Display the active page
```text
METHOD: GET
URL: /display
RESPONSE: <html></html>
```

#### CLICK
Click on something on the page
```text
METHOD: POST
URL: /click
BODY: 
{
  query: "#someQuerySelector"
}
```

#### FILL
Fill out some form inputs
```text
METHOD: POST
URL: /fill
BODY: 
{
  inputs: {
    #someQuerySelector": "value"
    #someQuerySelector2": "value2"
  }
}
```


