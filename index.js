"use strict";

require('dotenv').config({path:'bookingsystem-tasks.env'})
const fs = require('fs');
const cron = require('node-cron');
const axios = require('axios')
var crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars')


async function sendReminder(config) {
    //Hämta aktuella bokningar som ska bli påminda
    let bookings = await axios.get(`${process.env.BOOKINGSSYSTEM_API_URL}/reminderbookings/${config.system}/${config.from_time}/${config.end_time}/${config.status}/${config.type}`)
    
    bookings.data.forEach(async booking => {
        //För varje bokning uppdatera bokningen med en confirmation_code(för att kunna kvittera med ett enda klick på länk/knapp)
        let confirmation_code = crypto.randomBytes(64).toString('hex');
        
        let updatewithconfirmcode = await axios.put(`${process.env.BOOKINGSSYSTEM_API_URL}/entrysetconfirmcode/${config.system}/${booking.entry_id}/${confirmation_code}`,
                                                    { 
                                                        apikey: process.env.API_KEY_WRITE
                                                    })
        if (updatewithconfirmcode.data.affectedRows == 1) {
            //success
            //Skicka mail till den som bokat
            let mailresponse = await sendMail(booking);
            //Om mailet går bra sätt reminded = 1 på bokningen
            if (mailresponse) {
                let updatereminded = await axios.put(`${process.env.BOOKINGSSYSTEM_API_URL}/entrysetreminded/${config.system}/${booking.entry_id}`,
                                                    { 
                                                        apikey: process.env.API_KEY_WRITE
                                                    })
                console.log(updatereminded.data)
            } else {
                console.log("Det gick inte att skicka mail")
            }
        }
    });
}

async function sendMail(booking) {
    const handlebarOptions = {
        viewEngine: {
            partialsDir: path.resolve('./templates/'),
            defaultLayout: false,
        },
        viewPath: path.resolve('./templates/'),
    };

    const transporter = nodemailer.createTransport({
        port: 25,
        host: process.env.SMTP_HOST,
        tls: {
            rejectUnauthorized: false
        }
    });

    transporter.use('compile', hbs(handlebarOptions))

    let mailoptions = {}
    let template = 'email_sv'
    let subject = process.env.MAILFROM_SUBJECT_SV
    let locale = 'sv-SE'
    if (booking.lang.toUpperCase() == "EN") {
        template = 'email_en'
        subject = process.env.MAILFROM_SUBJECT_EN
        locale = 'us-EN'
    }

    let confirm_time_hh_mm = new Date(booking.start_time * 1000)
    let start_time_hh_mm = new Date(booking.start_time * 1000).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit"})
    let start_time_weekday_day_month = new Date(booking.start_time * 1000).toLocaleDateString(locale,{  weekday: 'long', month: 'long', day: '2-digit' })
    let start_time_weekday = new Date(booking.start_time * 1000).toLocaleDateString(locale, { weekday: "long"})
    let start_time_day = new Date(booking.start_time * 1000).toLocaleDateString(locale, { day: '2-digit'})
    let start_time_month = new Date(booking.start_time * 1000).toLocaleDateString(locale, { month: 'long'})

    let end_time_hh_mm = new Date(booking.end_time * 1000).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit"})

    confirm_time_hh_mm.setMinutes(confirm_time_hh_mm.getMinutes() -15)
    let confirm_start_time = confirm_time_hh_mm.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit"})

    confirm_time_hh_mm.setMinutes(confirm_time_hh_mm.getMinutes() +30)    
    let confirm_end_time = confirm_time_hh_mm.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit"})


    mailoptions = {
        from: {
            address: process.env.MAILFROM_ADDRESS
        },
        to: booking.entry_create_by,
        subject: subject,
        template: template,
        context:{
            entry_id: booking.entry_id,
            room_number: booking.room_number,
            start_time_hh_mm: start_time_hh_mm,
            end_time_hh_mm: end_time_hh_mm,
            start_time_weekday_day_month: start_time_weekday_day_month,
            start_time_weekday: start_time_weekday,
            start_time_day: start_time_day,
            start_time_month: start_time_month,
            confirm_start_time: confirm_start_time,
            confirm_end_time: confirm_end_time,
            confirm_url: process.env.CONFIRM_URL,
            edit_entry_url: process.env.EDIT_ENTRY_URL
        },
        generateTextFromHTML: true
    };

    try {
        let contactmemailinfo = await transporter.sendMail(mailoptions);
        return true
    } catch (err) {
        console.log(err.response)
        return false
    }
}

// Grupprum och Resursrum
cron.schedule(process.env.CRON_REMINDER_GRB_RS, () => {
    let config

    var currenttime = new Date();
    //Timestamp now
    let timestampnow = Math.floor(currenttime.getTime()/1000)
    //Sätt timme till nästa och sekunder/minuter till 0
    currenttime.setHours(currenttime.getHours() + 1 );
    currenttime.setMinutes(0)
    currenttime.setSeconds(0)
    //Timestamp nästa heltimme
    let timestampnexthour = Math.floor(currenttime.getTime()/1000)

    //Grupprum
    config = {
        "system": "grouprooms",
        "from_time": timestampnexthour,//Nästa heltimme
        "end_time": timestampnexthour,//Nästa heltimme
        "status" : 4,
        "type" : "I",
        "mail": "tholind@kth.se"
    }
    sendReminder(config)
    //Lässtudio
    config = {
        "system": "readingstudios",
        "from_time": timestampnexthour,//Nästa heltimme
        "end_time": timestampnexthour,//Nästa heltimme
        "status" : 4,
        "type" : "I",
        "mail": "tholind@kth.se"
    }
    sendReminder(config)
});

//Handledning och Talbok
cron.schedule(process.env.CRON_REMINDER_HL_TB, () => {
    let config

    var currenttime = new Date();
    
    //Sätt dag till nästa och sekunder/minuter till 0
    currenttime.setDate(currenttime.getDate() + 1 );
    
    //Timestamp imorgon 00:00
    currenttime.setHours(0)
    currenttime.setMinutes(0)
    currenttime.setSeconds(0)
    let timestampnextday_from = Math.floor(currenttime.getTime()/1000)

    //Timestamp imorgon 23:59
    currenttime.setHours(23)
    currenttime.setMinutes(59)
    currenttime.setSeconds(59)
    let timestampnextday_to = Math.floor(currenttime.getTime()/1000)

    // Talbok
    config = {
        "type": "talbok",
        "from_time": timestampnextday_from,
        "end_time": timestampnextday_to,
        "status" : 0,
        "type" : "I",
        "mail": "tholind@kth.se"
    }
    sendReminder(config)

    // Handledning
    config = {
        "type": "handledning",
        "from_time": timestampnextday_from,
        "end_time": timestampnextday_to,
        "status" : 0,
        "type" : "I",
        "mail": "tholind@kth.se"
    }
    sendReminder(config)
});