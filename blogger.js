async function getJsonData(path){
    /**
     * Fetches the json data and returns it as an Object
     * @param   {String}    path    The path where the json file should be located
     * @returns {Object}            The json data as a dictionary
     */
    let jsonFile = null;
    console.log('Getting file at: ' + path)
    await fetch(path)
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            jsonFile = data
        })
    return jsonFile
}

function postSorter(property, reversed){
    /**
     * More convenient syntax for sorting create/update dates
     * @param {String} property the property to use as the index for sorting
     * @param {boolean} reversed whether to order things in reverse
     */
    if (reversed) {
        return function (a, b) {
            if (a[property] < b[property])
                return 1;
            else if (a[property] > b[property])
                return -1;
            return 0;
        }
    }
    else{
        return function (a, b) {
            if (a[property] > b[property])
                return 1;
            else if (a[property] < b[property])
                return -1;
            return 0;
        }
    }
}

class BlogPost {
    /**
     * @param {Object} data A json-format object with necessary attributes for a blog post
     */
    constructor(data){
        console.log(data)
        this.title =    data['title'];
        this.created =  new Date(data['created']);
        this.updated =  new Date(data['updated']);
        this.author =   data['author'];
        this.tags =     data['tags'].split(',');
        this.content =  data['content'];
    }

    getTitle(){     return this.title;}
    getCreated(){   return this.created;}
    getUpdated(){   return this.updated;}
    getAuthor(){    return this.author;}
    getTags(){      return this.tags;}
    getContent(){   return this.content;}

    toString(){
        return  'Title:\t' + this.getTitle() + '\n'+
            'Created:\t' + this.getCreated() + '\n'+
            'Updated:\t' + this.getUpdated() + '\n'+
            'Author:\t' + this.getAuthor() + '\n'+
            'Tags:\t' + this.getTags().join(', ');
    }

    equals(obj){
        try{
            return this.getTitle() === obj.getTitle() && this.getCreated().valueOf() === obj.getCreated().valueOf() &&
                this.getUpdated().valueOf() === obj.getUpdated().valueOf() && this.getAuthor() === obj.getAuthor() &&
                JSON.stringify(this.getTags()) === JSON.stringify(obj.getTags()) && this.getContent() === obj.getContent()
        }
        catch{
            return false
        }
    }
}

class BlogPostMeta {
    /**
     * Acts as a stand-in for the blog posts to allow for sorting/filtering without loading their full contents into memory
     * @param {String} directory    The folder this resource can be found out
     * @param {Object} data         json-format data containing metadata about the blog post
     */
    constructor(directory='', data){
        this.title =    data['title'];
        this.id =       data['path'];
        this.path =     directory + '/' + data['path'];
        this.created =  data['created'];
        this.updated =  data['updated'];
        this.tags =     data['tags'].split(',');
    }

    getTitle(){     return this.title}
    getId(){        return this.id}
    getPath(){      return this.path}
    getCreated(){   return this.created}
    getUpdated(){   return this.updated}
    getTags(){      return this.tags}

    async getPost(){
        /**
         * @returns {BlogPost} BlogPost object built from the stored path
         */
        return new BlogPost(await getJsonData(this.path))
    }

    toString(){
        return  'Title:\t' + this.getTitle() + '\n'+
            'Created:\t' + this.getCreated() + '\n'+
            'Updated:\t' + this.getUpdated() + '\n'+
            'Path:\t' + this.getPath() + '\n'+
            'Tags:\t' + this.getTags().join(', ');
    }
}

class BlogPostMetaList {
    /**
     * Stores a list of blog post metadata objects
     * @param {String} file         the name of the file where the metadata is stored
     * @param {String} directory    the directory path where the metadata file is stored
     */
    constructor(file, directory=''){
        console.debug('Getting metadata from '+directory+file)
        this.directory = directory
        this.path = directory + file
        this.initialized = false
        this.posts = this.init()
    }

    convertToMetadataObject(data){
        /**
         * Converts a list of Objects into BlogPostMeta objects
         * @type {Array<Object>} a list of Objects to be transformed into BlogPost Meta objects
         */
        let metadata = []
        data.forEach(post => {
            metadata[metadata.length] = new BlogPostMeta(this.directory, post)
        })
        return metadata
    }

    async init(){
        /**
         * Fetches the json file for the blog post metadata, places it into an instance array, and marks the object
         * as initialized
         * @returns {Array<BlogPostMeta>}
         */
        this.initialized = true
        let data = await getJsonData(this.path)
        console.debug('Got json data:')
        console.debug(data)
        this.posts = this.convertToMetadataObject(data['posts'])
        return this.posts
    }

    async getPosts(){
        /**
         * Initializes the post list if it is not already initialized and returns the data
         * @returns {Array<BlogPostMeta>}
         */
        if(!this.initialized){ return await this.init() }
        return this.posts
    }

    async getPostsSorted(attr='created', reverse=false){
        /**
         * @param {String} attr the attribute from the metadata to sort by
         * @param {boolean} reverse whether to sort in reverse order
         */
        return (await this.getPosts()).sort(postSorter('created', reverse))
    }

    async getPostsMostRecent(){ return this.getPostsSorted('created', false) }
}

function getTitleHtml(post){
    /**
     * Takes the title data from a blog post and creates an HTML header
     * @param {BlogPost} post the blog post to get the title from
     * @returns {String} HTML header representation of the title
     */
    return '<h3>' + post.getTitle() + '</h3>'
}

function getTimestampHtml(post){
    /**
     * Takes the creation/update data from a blog post and creates HTML formatted text from it. If the creation/update
     * times are identical, no update time will be listed
     * @param {BlogPost} post the blog post to pull the time information from
     * @returns {String} HTML formatted text representation of the creation/update times
     */
    let updated = ''
    let created = '<p class="timestamp">Written by ' + post.getAuthor() + ' on ' +
        post.getCreated().toLocaleString('en-US', {'month': 'long', 'day': 'numeric', 'year': 'numeric'}) + '</p>'
    if (post.getCreated().valueOf() !== post.getUpdated().valueOf()) {
        updated = '<p class="timestamp">Updated on ' +
            post.getUpdated().toLocaleString('en-US', {'month': 'long', 'day': 'numeric', 'year': 'numeric'}) + '</p>'
    }
    return created + updated
}

function getBodyHtml(post){
    /**
     * Takes the content from a blog post and replaces the newlines with paragraph tags
     * @param {BlogPost} post the blog post to pull content from
     */
    return '<p>' + post.getContent().replace(/\n/g, '</p><p>') + '</p>'
}

async function getPostHtml(postMeta, contentOnly=false){
    /**
     * Takes a metadata object, fetches the post it references, and formats the post data into site-ready HTML
     * @param {BlogPostMeta} postMeta a metadata object referencing the post to generate
     * @returns {String} HTML formatted string containing all relevant data from the post
     */
    let post = await postMeta.getPost()
    console.log(getTitleHtml(post) + getTimestampHtml(post) + getBodyHtml(post))
    if(contentOnly) return getTitleHtml(post) + getTimestampHtml(post) + getBodyHtml(post)
    else return '<article>' + getTitleHtml(post) + getTimestampHtml(post) + getBodyHtml(post) + '</article>'
}

async function getBlogPosts(domId, directory, file, maxPosts=5, sortBy='created', reverse=true){
    /**
     * Gets all the blog posts in the directory, sorts them, parses them into HTML, and inserts them into the body
     * of the dom element with a matching ID
     * @param {String} domId the id of the dom element to place the HTML
     * @param {String} directory the folder path where the blog entries are located
     * @param {String} file the name of the file for the directory
     * @param {int} maxPosts the maximum number of posts to display (UNIMPLEMENTED)
     * @param {String} sortBy the attribute for sorting the posts by
     * @param {boolean} reverse whether to sort in reverse order
     */
        //TODO: implement maxPosts
    let content = getPostFromUrl()
    let postList = await new BlogPostMetaList(file, directory).getPostsSorted(sortBy, reverse)
    for(const postMeta in postList){
        console.log(postList[postMeta])
        content += await getPostHtml(postList[postMeta])
    }
    document.getElementById(domId).innerHTML = content
}

async function getBlogPostsWithTags(){
    //TODO: implement ability to yield all blog posts with a certain tag
}

async function getPostFromUrl(){
    //TODO: implement ability to load blog post based on url params. engiqueering.com/blog.html?postId="example123" will render a post from example123.json
    return ''
}

async function latestBlogPost(domId, directory, file, maxChars, contentOnly){
    /**
     * Finds the most recent post in the directory and returns an HTML formatted version
     * @param {String} domId the id of the dom element to place the HTML
     * @param {String} directory the folder path where the blog entries are located
     * @param {String} file the name of the file for the directory
     * @param {int} maxChars the maximum number of characters to display before cutting the post off. Setting to
     * -1 removes limit
     * @param {boolean} contentOnly whether to omit the article tags
     */
    let content = ''
    let postList = await new BlogPostMetaList(file, directory).getPostsSorted('created', true)
    content += await getPostHtml(postList[0], contentOnly)
    if (maxChars >= 0){
        content = content.substr(0, maxChars)
        if (content.length === maxChars) {
            // if the length and maxChars are equal we assume we cut off on the last word and need to remove the bit leftover
            content = content.substr(0, Math.min(content.length, content.lastIndexOf(" ")))
        }
        content += '<a href="blog.html?id=\''+postList[0].getId().replace('.json', '')+'\'"><i>Read More</i></a>'
    }
    document.getElementById(domId).innerHTML = content
}

async function tests(){
    let post0 = new BlogPost({"title": "testTitle0", "created": "2022-01-20", "updated": "2022-01-21", "author": "sampleAuthor0", "tags": "tag0-0,tag0-1,tag0-2","content": "content0"})
    let post1 = new BlogPost({"title": "testTitle1", "created": "2022-01-21", "updated": "2022-01-22", "author": "sampleAuthor1", "tags": "tag1-0,tag1-1,tag1-2","content": "content1"})
    let post2 = new BlogPost({"title": "testTitle2", "created": "2022-01-22", "updated": "2022-01-23", "author": "sampleAuthor2", "tags": "tag2-0,tag2-1,tag2-2","content": "content2"})
    let post3 = new BlogPost({"title": "testTitle3", "created": "2022-01-23", "updated": "2022-01-24", "author": "sampleAuthor3", "tags": "tag3-0,tag3-1,tag3-2","content": "content3"})

    // get the list of metadata objects
    let metalist = await new BlogPostMetaList('testdir.json', 'sample/')
    let posts = await metalist.getPosts()

    // should print 'true' to the browser console
    console.log(post0.equals(await posts[0].getPost()))
}