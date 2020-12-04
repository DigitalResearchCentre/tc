//emailer ======================================================================
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var auth = {
  auth: {
    api_key: '',
    domain: ''
  }
};


exports.localmailer = nodemailer.createTransport(mg(auth));

exports.addresses = {
	from: 'peter@sd-editions.com',
	replyto: 'peter@sd-editions.com'
};
