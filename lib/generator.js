'use strict';

var pagination = require('hexo-pagination');
var _pick = require('lodash.pick');

module.exports = function (cfg, site) {

    var restful = cfg.hasOwnProperty('restful') ? cfg.restful :
        {
            site: true,
            posts_size: 10,
            posts_props: {
                title: true,
                slug: true,
                date: true,
                updated: true,
                comments: true,
                path: true,
                raw: false,
                excerpt: false,
                content: false,
                categories: true,
                tags: true
            },
            categories: true,
            tags: true,
            post: true
        },

        posts = site.posts.sort('-date').filter(function (post) {
            return post.published;
        }),

        posts_props = (function () {
            var props = restful.posts_props;

            return function (name, val) {
                return props[name] ? (typeof val === 'function' ? val() : val) : null;
            }
        })(),

        postMap = function (post) {
            return {
                title: posts_props('title', post.title),
                slug: posts_props('slug', post.slug),
                date: posts_props('date', post.date),
                updated: posts_props('updated', post.updated),
                comments: posts_props('comments', post.comments),
                path: posts_props('path', 'api/articles/' + post.slug + '.json'),
                excerpt: posts_props('excerpt', post.excerpt),
                keywords: posts_props('keywords', cfg.keywords),
                content: posts_props('content', post.content),
                raw: posts_props('raw', post.raw),
                categories: posts_props('categories', function () {
                    return post.categories.map(function (cat) {
                        return {
                            name: cat.name,
                            path: 'api/categories/' + cat.name + '.json'
                        };
                    });
                }),
                tags: posts_props('tags', function () {
                    return post.tags.map(function (tag) {
                        return {
                            name: tag.name,
                            path: 'api/tags/' + tag.name + '.json'
                        };
                    });
                })
            };
        },

        cateReduce = function (cates, name) {
            return cates.reduce(function (result, item) {
                if (!item.length) return result;

                return result.concat(pagination(item.path, posts, {
                    perPage: 0,
                    data: {
                        name: item.name,
                        path: 'api/' + name + '/' + item.name + '.json',
                        postlist: item.posts.map(postMap)
                    }

                }));
            }, []);
        },

        catesMap = function (item) {
            return {
                name: item.data.name,
                path: item.data.path,
                count: item.data.postlist.length
            };
        },

        cateMap = function (item) {
            var itemData = item.data;
            return {
                path: itemData.path,
                data: JSON.stringify({
                    name: itemData.name,
                    postlist: itemData.postlist
                })
            };
        },

        apiData = [];


    if (restful.site) {
        apiData.push({
            path: 'api/site.json',
            data: JSON.stringify(restful.site instanceof Array ? _pick(cfg, restful.site) : cfg)
        });
    }

    if (restful.categories) {

        var cates = cateReduce(site.categories, 'categories');

        if (!!cates.length) {
            apiData.push({
                path: 'api/categories.json',
                data: JSON.stringify(cates.map(catesMap))
            });

            apiData = apiData.concat(cates.map(cateMap));
        }

    }

    if (restful.tags) {
        var tags = cateReduce(site.tags, 'tags');

        if (tags.length) {
            apiData.push({
                path: 'api/tags.json',
                data: JSON.stringify(tags.map(catesMap))
            });

            apiData = apiData.concat(tags.map(cateMap));
        }

    }

    var postlist = posts.map(postMap);

    if (restful.posts_size > 0) {

        var page_posts = [],
            i = 0,
            len = postlist.length,
            ps = restful.posts_size,
            pc = Math.ceil(len / ps);

        for (; i < len; i += ps) {
            page_posts.push({
                path: 'api/posts/' + Math.ceil((i + 1) / ps) + '.json',
                data: JSON.stringify({
                    total: len,
                    pageSize: ps,
                    pageCount: pc,
                    data: postlist.slice(i, i + ps)
                })
            });
        }

        apiData.push({
            path: 'api/posts.json',
            data: page_posts[0].data
        });

        apiData = apiData.concat(page_posts);

    } else {

        apiData.push({
            path: 'api/posts.json',
            data: JSON.stringify(postlist)
        });
    }

    if (restful.post) {
        apiData = apiData.concat(posts.map(function (post) {
            var path = 'api/articles/' + post.slug + '.json';
            return {
                path: path,
                data: JSON.stringify({
                    title: post.title,
                    slug: post.slug,
                    date: post.date,
                    updated: post.updated,
                    comments: post.comments,
                    path: path,
                    excerpt: post.excerpt,
                    keywords: cfg.keyword,
                    content: post.content,
                    categories: post.categories.map(function (cat) {
                        return {
                            name: cat.name,
                            path: 'api/categories/' + cat.name + '.json'
                        };
                    }),
                    tags: post.tags.map(function (tag) {
                        return {
                            name: tag.name,
                            path: 'api/tags/' + tag.name + '.json'
                        };
                    })
                })
            };
        }));
    }

    return apiData;
};
