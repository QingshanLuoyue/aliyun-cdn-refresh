const https = require('https')
const moment = require('moment')
const hmacSHA1 = require('crypto-js/hmac-sha1')
const Base64 = require('crypto-js/enc-base64')

let cdn_server_address = 'https://cdn.aliyuncs.com'
let ObjectPath = 'test.txt' // 刷新文件或者目录
let ObjectType = 'File'  // 刷新的是目录或者文件

let end = (new Date().getTime() - 8 * 60 * 60 * 1000) / 1000 // 获取当前的时间后 需要减去8个小时的时差
// cdn刷新请求参数
let cdnRequest = {
    accessKeySecret: 'testAccessKeySecret',
}
// 公共字典参数
let commonDictionaryParameters = [
    {
        name: 'Format',
        value: 'JSON',
    },
    {
        name: 'Version',
        value: '2018-05-10',
    },
    {
        name: 'AccessKeyId',
        value: 'testAccessKeyId',
    },
    {
        name: 'SignatureVersion',
        value: '1.0',
    },
    {
        name: 'SignatureMethod',
        value: 'HMAC-SHA1',
    },
    {
        name: 'SignatureNonce',
        value: rndNum(14),
    },
    {
        name: 'Timestamp',
        value: moment(end, 'X').utc(8).format('YYYY-MM-DDTHH:mm:ss') + 'Z',
    },
]
// 刷新参数
let refreshParam = [
    {
        name: 'Action',
        value: 'RefreshObjectCaches'
    },
    {
        name: 'ObjectPath',
        value: ObjectPath
    },
    {
        name: 'ObjectType',
        value: ObjectType
    }
]
// 随机数
function rndNum(n){
    let rnd = ''
    for(let i = 0; i < n; i++)
        rnd += Math.floor(Math.random() * 10)
    return rnd
}
// utf-8编码
function percentEncode(str) {
    let res = encodeURIComponent(str)
    res = res.replace(/\+/g, '%20')
    res = res.replace(/\*/g, '%2A')
    res = res.replace(/%7/g, '~')
    return res
}
// 参数排序
function compare (x, y) { // 比较函数
    if (x.name < y.name) {
        return -1
    } else if (x.name > y.name) {
        return 1
    } else {
        return 0
    }
}
// 计算签名
function computeSignature(parameters, access_key_secret) {
    // 根据字典位置对参数进行排序
    let sortedParameters = parameters.sort(compare)
    console.log('\nsortedParameters = ',  sortedParameters)
    
    let canonicalizedQueryString = ''
    // utf-8编码
    sortedParameters.forEach(item => {
        canonicalizedQueryString += '&' + percentEncode(item.name) + '=' + percentEncode(item.value)
    })
    canonicalizedQueryString = canonicalizedQueryString.slice(1)
    console.log('\ncanonicalizedQueryString = ',  canonicalizedQueryString)
    
    // 再次utf-8编码
    let stringToSign = 'GET&%2F&' + percentEncode(canonicalizedQueryString)
    console.log('\nstringToSign = ',  stringToSign)

    // 计算hmac值 使用sha1算法计算signature 
    let signature = Base64.stringify(hmacSHA1(stringToSign, access_key_secret + '&'));
    return signature
}
// 构造最终的请求地址
function composeUrl() {
    let finalParam = commonDictionaryParameters.concat(refreshParam)
    let signature = computeSignature(finalParam, cdnRequest.accessKeySecret)
    finalParam.push({
        name: 'Signature',
        value: signature
    })
    let str = ''
    finalParam.forEach(item => {
        str += '&' + percentEncode(item.name) + '=' + percentEncode(item.value)
    })
    str = str.slice(1)
    url = cdn_server_address + "/?" + str
    return url
}

let finalUrl = composeUrl()

console.log('\nfinalUrl = ', finalUrl)
https.get(finalUrl, res => {
    // console.log('res = ', res)
    let datas = []
    let size = 0
    res.on('data', data => {
        datas.push(data)
        size += data.length
    })
    res.on('end', () => {
        let buff = Buffer.concat(datas, size)
        let result = buff.toString()
        console.log('\nresult = ', result)
    })
}).on('error', err => {
    console.log('\nerror = ', err)
})