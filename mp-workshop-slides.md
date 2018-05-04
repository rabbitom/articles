## Mini Program Workshop
May 5th, 2018

## What is Mini Program
kind of mobile app between **web** and **native**

  ### Has advantages of both
  * web: No need to install, light-weight, easy update
  * native: Run fast, access native functionality

  ### Not a new thing
  * iPhone only support web apps at very first(https://9to5mac.com/2011/10/21/jobs-original-vision-for-the-iphone-no-third-party-native-apps/)
  * Hybrid apps - pack web pages to native apps
  * Progressive web apps - modern browser features

  ### Plus the WeChat ecosystem
  * large user base, spread easily
  * WeChat Pay, WeRun, etc.

## [Get started](https://developers.weixin.qq.com/miniprogram/dev/index.html)
1. Register an account
  * need an e-mail address and a WeChat account
  * personal vs copoerate
  * appid
2. Install the IDE
  * support Windows and Mac
3. Create a hello world project

  ## The Project Structure
  * Pages
    * Layout - what's on the screen
    * Style - how do they look like
    * Data - the contents and how do they changes
  * Backend - where data are from and saved

## Example - A book shelf app
* Search for book by name
* Add to favorites
* Take notes
* Share

  ## The data
  * the search text
  * the book info
    * cover
    * title
    * author

  ## The backend
  * a registred domain name and cloud server, like a website
  * [douban api](https://developers.douban.com/wiki/?title=book_v2) with [a proxy](https://github.com/zce/douban-api-proxy)
    * [search books](https://developers.douban.com/wiki/?title=book_v2#get_book_search): `https://api.douban.com/v2/book/search?q=`
    * [get book info](https://developers.douban.com/wiki/?title=book_v2#get_book): `https://api.douban.com/v2/book/:id`

  ![](images/book-mp-prototype.jpg)

## More ideas
### (no backend needed)
* body weight: record every day and show history in a chart
* book keeping: record income and  expend every day, show chart
* mark tv episode: mark the episode number you've watched
* credit card repay: record the deadlines to repay credit cards, sort in date

## More ideas
### (need a backend as data source)
* events
  * show events in a calendar
  * share event list with friends
* outsourcing projects
  * show list of outsourcing projects
  * add to favorites
  * post a project

## Contact

* Tom Hao
* website: [http://teamup.ren](http://teamup.ren)
* e-mail: cooltools@qq.com
* mobile/wechat: 18818555615
