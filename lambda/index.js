const Alexa = require('ask-sdk');
const constants = require('./constants');
const util = require('./util');

const skillName = 'Morning Meditation';

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = `Welcome to ${skillName}!, This skill will show you how to start your day. Once you are ready, just say start, to start meditating. I will guide you throughout the process. How can I help?`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard(skillName, speechText)
      .getResponse();
  },
};

const GetMeditationHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
          || handlerInput.requestEnvelope.request.intent.name === 'SimpleMeditationIntent'));
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 

    return monetizationClient.getInSkillProducts(locale).then((res) => {
      // Use the helper function getResponseBasedOnAccessType to determine the response based on the products the customer has purchased
      return getResponseBasedOnAccessType(handlerInput, res, preSpeechText);
    });
  },
};

const SteppedMeditationHandler = {
  canHandle(handlerInput) {
    return (handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SteppedMeditationIntent');
  },
  handle(handlerInput) {
      try{
        let cardText = `PLEASE FOLLOW THE MEDITATION STEPS`;
        let speechText =  constants.text.speechText;
        let repromptOutput = 'Now, You can also listen to the special morning meditation sounds, for that you can say: play morning meditation sounds. or you can exit the skill by saying stop. So, what would you like to do next?'
          return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(repromptOutput)
            .withSimpleCard(skillName, cardText)
            .getResponse();
      }catch(err){
          console.log(JSON.stringify(err))
          return handlerInput.responseBuilder
            .speak('speechText')
            .getResponse();
      }
  },
};

const NoIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent'
    );
  },
  handle(handlerInput) {

    // const speechText = `<speak>Thanks for using Morning Meditation. Please leave a 5 star review! ${getRandomGoodbye()} <break time="1s"/> <audio src="https://dl.dropboxusercontent.com/s/2zs3b0s8k97jaz5/stcreate_Add.mp3"/></speak>`;
    const speechText = `<speak>Thanks for using Morning Meditation. ${getRandomGoodbye()}</speak>`;
    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(true)
      .getResponse();
  },
};

// Respond to the utterance "what can I buy"
const WhatCanIBuyIntentHandler = {
  canHandle(handlerInput) {
    return (handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'WhatCanIBuyIntent');
  },
  handle(handlerInput) {
    // Get the list of products available for in-skill purchase
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    return monetizationClient.getInSkillProducts(locale).then((res) => {
      // res contains the list of all ISP products for this skill.
      // We now need to filter this to find the ISP products that are available for purchase (NOT ENTITLED)
      const purchasableProducts = res.inSkillProducts.filter(
        record => record.entitled === 'NOT_ENTITLED' &&
          record.purchasable === 'PURCHASABLE',
      );

      // Say the list of products
      if (purchasableProducts.length > 0) {
        // One or more products are available for purchase. say the list of products
        const speechText = `Products available for purchase at this time are ${getSpeakableListOfProducts(purchasableProducts)}. 
                            To learn more about a product, say 'Tell me more about' followed by the product name. 
                            If you are ready to buy, say, 'Buy' followed by the product name. So what can I help you with?`;
        const repromptOutput = 'I didn\'t catch that. What can I help you with?';
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .getResponse();
      }
      // no products are available for purchase. Ask if they would like to hear another greeting
      const speechText = 'There are no products to offer to you right now. Sorry about that. Would you like to start your morning meditation instead?';
      const repromptOutput = 'I didn\'t catch that. What can I help you with?';
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(repromptOutput)
        .getResponse();
    });
  },
};

const TellMeMoreAboutPremiumSubscriptionIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
           && handlerInput.requestEnvelope.request.intent.name === 'TellMeMoreAboutPremiumSubscription';
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return monetizationClient.getInSkillProducts(locale).then((res) => {


      const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',
      );

      if (isEntitled(premiumSubscriptionProduct)) {
        const speechText = `Good News! You're subscribed to the meditation Subscription. ${premiumSubscriptionProduct[0].summary} ${getRandomYesNoQuestion()}`;
        const repromptOutput = `${getRandomYesNoQuestion()}`;

        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .getResponse();
      }
      // Make the upsell
      const speechText = 'Sure.';
      return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
    });
  },
};

const BuyPremiumSubscriptionIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
           && handlerInput.requestEnvelope.request.intent.name === 'BuyPremiumSubscriptionIntent';
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return monetizationClient.getInSkillProducts(locale).then((res) => {
      // Filter the list of products available for purchase to find the product with the reference name "Morning_Meditation"
      const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',
      );

      // Send Connections.SendRequest Directive back to Alexa to switch to Purchase Flow
      return makeBuyOffer(premiumSubscriptionProduct, handlerInput);
    });
  },
};

const BuyResponseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'Connections.Response'
           && (handlerInput.requestEnvelope.request.name === 'Buy'
               || handlerInput.requestEnvelope.request.name === 'Upsell');
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;

    return monetizationClient.getInSkillProducts(locale).then((res) => {
      const product = res.inSkillProducts.filter(
        record => record.productId === productId,
      );

      if (handlerInput.requestEnvelope.request.status.code === '200') {
        let preSpeechText;

        // check the Buy status - accepted, declined, already purchased, or something went wrong.
        switch (handlerInput.requestEnvelope.request.payload.purchaseResult) {
          case 'ACCEPTED':
            preSpeechText = getBuyResponseText(product[0].referenceName, product[0].name);
            break;
          case 'DECLINED':
            preSpeechText = 'No Problem.';
            break;
          case 'ALREADY_PURCHASED':
            preSpeechText = getBuyResponseText(product[0].referenceName, product[0].name);
            break;
          default:
            preSpeechText = `Something unexpected happened, but thanks for your interest in the ${product[0].name}.`;
            break;
        }
        // respond back to the customer
        return getResponseBasedOnAccessType(handlerInput, res, preSpeechText);
      }
      // Request Status Code NOT 200. Something has failed with the connection.
      console.log(
        `Connections.Response indicated failure. error: + ${handlerInput.requestEnvelope.request.status.message}`,
      );
      return handlerInput.responseBuilder
        .speak('There was an error handling your purchase request. Please try again or contact us for help.')
        .getResponse();
    });
  },
};

const PurchaseHistoryIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'PurchaseHistoryIntent'
    );
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return monetizationClient.getInSkillProducts(locale).then(function (result) {
      const entitledProducts = getAllEntitledProducts(result.inSkillProducts);
      if (entitledProducts && entitledProducts.length > 0) {
        const speechText = `You have bought the following items: ${getSpeakableListOfProducts(entitledProducts)}. ${getRandomYesNoQuestion()}`;
        const repromptOutput = `You asked me for a what you've bought, here's a list ${getSpeakableListOfProducts(entitledProducts)}`;

        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .getResponse();
      }

      const speechText = 'You haven\'t purchased anything yet. To learn more about the products you can buy, say - what can I buy. How can I help?';
      const repromptOutput = `You asked me for a what you've bought, but you haven't purchased anything yet. You can say - what can I buy, or say yes to get another greeting. ${getRandomYesNoQuestion()}`;

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(repromptOutput)
        .getResponse();
    });
  },
};


const CancelPremiumSubscriptionIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'CancelPremiumSubscriptionIntent'
    );
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return monetizationClient.getInSkillProducts(locale).then((res) => {
      const premiumProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',
      );
      return handlerInput.responseBuilder
        .addDirective({
          type: 'Connections.SendRequest',
          name: 'Cancel',
          payload: {
            InSkillProduct: {
              productId: premiumProduct[0].productId,
            },
          },
          token: 'correlationToken',
        })
        .getResponse();
    });
  },
};

const CancelProductResponseHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'Connections.Response'
      && handlerInput.requestEnvelope.request.name === 'Cancel'
    );
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;
    let speechText;
    let repromptOutput;

    return monetizationClient.getInSkillProducts(locale).then((res) => {
      const product = res.inSkillProducts.filter(
        record => record.productId === productId,
      );

      console.log(
        `PRODUCT = ${JSON.stringify(product)}`,
      );

      if (handlerInput.requestEnvelope.request.status.code === '200') {
        // Alexa handles the speech response immediately following the cancellation request.
        // It then passes the control to our CancelProductResponseHandler() along with the status code (ACCEPTED, DECLINED, NOT_ENTITLED)
        // We use the status code to stitch additional speech at the end of Alexa's cancellation response.
        // Currently, we have the same additional speech (getRandomYesNoQuestion)for accepted, canceled, and not_entitled. You may edit these below, if you like.
        if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED') {
          // The cancellation confirmation response is handled by Alexa's Purchase Experience Flow.
          // Simply add to that with getRandomYesNoQuestion()
          speechText = `${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();
        } else if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'DECLINED') {
          speechText = `${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();
        } else if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'NOT_ENTITLED') {
          // No subscription to cancel.
          // The "No subscription to cancel" response is handled by Alexa's Purchase Experience Flow.
          // Simply add to that with getRandomYesNoQuestion()
          speechText = `${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .getResponse();
      }
      // Something failed.
      console.log(`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`);

      return handlerInput.responseBuilder
        .speak('There was an error handling your purchase request. Please try again or contact us for help.')
        .getResponse();
    });
  },
};

const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type.startsWith('AudioPlayer.');
  },
  async handle(handlerInput) {
    const {
      requestEnvelope,
      attributesManager,
      responseBuilder
    } = handlerInput;
    const audioPlayerEventName = requestEnvelope.request.type.split('.')[1];
    const {
      playbackSetting,
      playbackInfo
    } = await attributesManager.getPersistentAttributes();

    switch (audioPlayerEventName) {
      case 'PlaybackStarted':
        playbackInfo.token = getToken(handlerInput);
        playbackInfo.index = await getIndex(handlerInput);
        playbackInfo.inPlaybackSession = true;
        playbackInfo.hasPreviousPlaybackSession = true;
        break;
      case 'PlaybackFinished':
        playbackInfo.inPlaybackSession = false;
        playbackInfo.hasPreviousPlaybackSession = false;
        playbackInfo.nextStreamEnqueued = false;
        break;
      case 'PlaybackStopped':
        playbackInfo.token = getToken(handlerInput);
        playbackInfo.index = await getIndex(handlerInput);
        playbackInfo.offsetInMilliseconds = getOffsetInMilliseconds(handlerInput);
        break;
      case 'PlaybackNearlyFinished':
        {
          if (playbackInfo.nextStreamEnqueued) {
            break;
          }

          const enqueueIndex = (playbackInfo.index + 1) % constants.audioData.length;

          if (enqueueIndex === 0 && !playbackSetting.loop) {
            break;
          }

          playbackInfo.nextStreamEnqueued = true;

          const enqueueToken = playbackInfo.playOrder[enqueueIndex];
          const playBehavior = 'ENQUEUE';
          const meditation = constants.audioData[playbackInfo.playOrder[enqueueIndex]];
          const expectedPreviousToken = playbackInfo.token;
          const offsetInMilliseconds = 0;
          
          console.log(util.getS3PreSignedUrl(meditation.url))
          
          responseBuilder.addAudioPlayerPlayDirective(
            playBehavior,
            util.getS3PreSignedUrl(meditation.url),
            enqueueToken,
            offsetInMilliseconds,
            expectedPreviousToken,
          );
          break;
        }
      case 'PlaybackFailed':
        playbackInfo.inPlaybackSession = false;
        console.log('Playback Failed : %j', handlerInput.requestEnvelope.request.error);
        return;
      default:
        throw new Error('Should never reach here!');
    }

    return responseBuilder.getResponse();
  },
};

const CheckAudioInterfaceHandler = {
  async canHandle(handlerInput) {
    const audioPlayerInterface = ((((handlerInput.requestEnvelope.context || {}).System || {}).device || {}).supportedInterfaces || {}).AudioPlayer;
    return audioPlayerInterface === undefined
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Sorry, this skill is not supported on this device')
      .withShouldEndSession(true)
      .getResponse();
  },
};

const StartPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    const request = handlerInput.requestEnvelope.request;
    if (!playbackInfo.inPlaybackSession) {
      return request.type === 'IntentRequest' && request.intent.name === 'PlayAudio';
    }
    if (request.type === 'PlaybackController.PlayCommandIssued') {
      return true;
    }
    if (request.type === 'IntentRequest') {
      return request.intent.name === 'PlayAudio' ||
        request.intent.name === 'AMAZON.ResumeIntent';
    }
  },

  async handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 
    return monetizationClient.getInSkillProducts(locale).then((res) => {
        const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',);
        let speechText;
        let cardText;
        let repromptOutput;
        
        if (isEntitled(premiumSubscriptionProduct)){
            return controller.play(handlerInput);
        }else {
            if (shouldUpsell(handlerInput)) {
                speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
              return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
            }
            speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
            cardText = `How can I help?`;
            repromptOutput = `So, How can I help?`;
            
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .withSimpleCard(cardText)
          .getResponse();
    });
  },
};

const NextPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      (request.type === 'PlaybackController.NextCommandIssued' ||
        (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NextIntent'));
  },
    async handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 

    return monetizationClient.getInSkillProducts(locale).then((res) => {
        const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',);
        let speechText;
        let cardText;
        let repromptOutput;
        
        if (isEntitled(premiumSubscriptionProduct)) {
            return controller.playNext(handlerInput);
        }else {
            if (shouldUpsell(handlerInput)) {
                speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
              return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
            }
            speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
            cardText = `How can I help?`;
            repromptOutput = `So, How can I help?`;
            
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .withSimpleCard(cardText)
          .getResponse();
    });
  },
};

const PreviousPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      (request.type === 'PlaybackController.PreviousCommandIssued' ||
        (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.PreviousIntent'));
  },
     async handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 

    return monetizationClient.getInSkillProducts(locale).then((res) => {
        const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',);
        let speechText;
        let cardText;
        let repromptOutput;
        
        if (isEntitled(premiumSubscriptionProduct)) {
            return controller.playPrevious(handlerInput);
        }else {
            if (shouldUpsell(handlerInput)) {
                speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
              return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
            }
            speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
            cardText = `How can I help?`;
            repromptOutput = `So, How can I help?`;
            
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .withSimpleCard(cardText)
          .getResponse();
        
    });
  },
};

const PausePlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.StopIntent' ||
        request.intent.name === 'AMAZON.CancelIntent' ||
        request.intent.name === 'AMAZON.PauseIntent');
  },
  handle(handlerInput) {
    return controller.stop(handlerInput);
  },
};

const LoopOnHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.LoopOnIntent';
  },
async handle(handlerInput) {

    const playbackSetting = await getPlaybackSetting(handlerInput);
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 
    return monetizationClient.getInSkillProducts(locale).then((res) => {
        const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation');
        let speechText;
        let cardText;
        let repromptOutput;
        
        if (isEntitled(premiumSubscriptionProduct)) {
            if(!playbackSetting.loop){
                speechText = 'Loop turned on.';
                playbackSetting.loop = true;
            }
            else{
                speechText = 'Loop already turned on.';
            }
            return handlerInput.responseBuilder
              .speak(speechText)
              .getResponse();
        }else {
            if (shouldUpsell(handlerInput)) {
                speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
              return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
            }
            speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
            cardText = `How can I help?`;
            repromptOutput = `So, How can I help?`;
            
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .withSimpleCard(cardText)
          .getResponse();
        
    });
  },
};

const LoopOffHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.LoopOffIntent';
  },
async handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 
    const playbackSetting = await getPlaybackSetting(handlerInput);
    
    return monetizationClient.getInSkillProducts(locale).then((res) => {
        
        const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',);
        let speechText;
        let cardText;
        let repromptOutput;
        
        
        if (isEntitled(premiumSubscriptionProduct)) {
            if(playbackSetting.loop){
                speechText = 'Loop turned off.';
                playbackSetting.loop = false;
            }
            else{
                speechText = 'Loop already turned off.';
            }
            return handlerInput.responseBuilder
              .speak(speechText)
              .getResponse();
        }else {
            if (shouldUpsell(handlerInput)) {
                speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
              return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
            }
            speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
            cardText = `How can I help?`;
            repromptOutput = `So, How can I help?`;
            
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .withSimpleCard(cardText)
          .getResponse();
        
    });
  },
};

const ShuffleOnHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.ShuffleOnIntent';
  },
 
  async handle(handlerInput) {
      
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const playbackSetting = await getPlaybackSetting(handlerInput);
    const newPlayOrder = await shuffleOrder();
    
    return monetizationClient.getInSkillProducts(locale).then((res) => {
        const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',);
        let speechText;
        let cardText;
        let repromptOutput;
        
        if (isEntitled(premiumSubscriptionProduct)) {
            if(!playbackSetting.shuffle){
                playbackSetting.shuffle = true;
                playbackInfo.playOrder = newPlayOrder;
                playbackInfo.index = 0;
                playbackInfo.offsetInMilliseconds = 0;
                playbackInfo.playbackIndexChanged = true;
            }
            return controller.play(handlerInput);
        }else {
            if (shouldUpsell(handlerInput)) {
                speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
              return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
            }
            speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
            cardText = `How can I help?`;
            repromptOutput = `So, How can I help?`;
            
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .withSimpleCard(cardText)
          .getResponse();
        
    });
  },
};

const ShuffleOffHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.ShuffleOffIntent';
  },
    async handle(handlerInput) {
      
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const playbackSetting = await getPlaybackSetting(handlerInput);
    const newPlayOrder = await shuffleOrder();
    
    return monetizationClient.getInSkillProducts(locale).then((res) => {
        const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',);
        let speechText;
        let cardText;
        let repromptOutput;
        
        if (isEntitled(premiumSubscriptionProduct)) {
            if (playbackSetting.shuffle) {
              playbackSetting.shuffle = false;
              playbackInfo.index = playbackInfo.playOrder[playbackInfo.index];
              playbackInfo.playOrder = [...Array(constants.audioData.length).keys()];
            }
            return controller.play(handlerInput);
        }else {
            if (shouldUpsell(handlerInput)) {
                speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
              return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
            }
            speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
            cardText = `How can I help?`;
            repromptOutput = `So, How can I help?`;
            
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .withSimpleCard(cardText)
          .getResponse();
    });
  },
};

const StartOverHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.StartOverIntent';
  },
async handle(handlerInput) {
      
    const locale = handlerInput.requestEnvelope.request.locale;
    const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const preSpeechText = ''; 
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const newPlayOrder = await shuffleOrder();
    
    return monetizationClient.getInSkillProducts(locale).then((res) => {
        const premiumSubscriptionProduct = res.inSkillProducts.filter(
        record => record.referenceName === 'Morning_Meditation',);
        let speechText;
        let cardText;
        let repromptOutput;
        
        if (isEntitled(premiumSubscriptionProduct)) {
            playbackInfo.offsetInMilliseconds = 0;
            return controller.play(handlerInput);
        }else {
            if (shouldUpsell(handlerInput)) {
                speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
              return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
            }
            speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
            cardText = `How can I help?`;
            repromptOutput = `So, How can I help?`;
            
        }
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(repromptOutput)
          .withSimpleCard(cardText)
          .getResponse();
        
    });
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const speechText = `This is ${skillName}!, This skill will show you how to start your day. Once you are ready, just say start, to start meditating. I will guide you throughout the process. How can I help?`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard(skillName, speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.speak('session ended').getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const ExitHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;


    return !playbackInfo.inPlaybackSession &&
      request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.StopIntent' ||
        request.intent.name === 'AMAZON.CancelIntent');
  },
  handle(handlerInput) {
    // const speechText = `<speak>Thanks for using Morning Meditation. Please leave a 5 star review! ${getRandomGoodbye()} <break time="1s"/> <audio src="https://dl.dropboxusercontent.com/s/2zs3b0s8k97jaz5/stcreate_Add.mp3"/></speak>`;
    const speechText = `<speak>Thanks for using Morning Meditation. ${getRandomGoodbye()}</speak>`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SystemExceptionHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'System.ExceptionEncountered';
  },
  handle(handlerInput) {
    console.log(`System exception encountered: ${handlerInput.requestEnvelope.request.reason}`);
  },
};

// *****************************************
// *********** HELPER FUNCTIONS ************
// *****************************************

function randomize(array) {
  const randomItem = array[Math.floor(Math.random() * array.length)];
  return randomItem;
}

function getRandomGoodbye() {
  const goodbyes = [
    'OK.  Goodbye!',
    'Have a great day!',
    'Come back again soon!',
  ];
  return randomize(goodbyes);
}

function getRandomYesNoQuestion() {
  const questions = [
    'To get more info on that you say things like, what is meditation subscription',
    'To get more info on that you say things like, what is meditation subscription',
    'To get more info on that you say things like, what is meditation subscription'
  ];
  return randomize(questions);
}

function getRandomLearnMorePrompt() {
  const questions = [
    'Want to learn more about it?',
    'Should I tell you more about it?',
    'Want to learn about it?',
    'Interested in learning more about it?',
  ];
  return randomize(questions);
}

function getSpeakableListOfProducts(entitleProductsList) {
  const productNameList = entitleProductsList.map(item => item.name);
  let productListSpeech = productNameList.join(', '); // Generate a single string with comma separated product names
  productListSpeech = productListSpeech.replace(/_([^_]*)$/, 'and $1'); // Replace last comma with an 'and '
  return productListSpeech;
}

async function getResponseBasedOnAccessType(handlerInput, res, preSpeechText) {


  const premiumSubscriptionProduct = res.inSkillProducts.filter(
    record => record.referenceName === 'Morning_Meditation',
  );

  console.log(
    `MEDITATION SUBSCRIPTION PRODUCT = ${JSON.stringify(premiumSubscriptionProduct)}`,
  );

  let speechText;
  let cardText;
  let repromptOutput;

  if (isEntitled(premiumSubscriptionProduct)) {
    // Customer has bought the Meditation Subscription.
    // >> work to be done audio files to access after bought
    const playbackInfo = await getPlaybackInfo(handlerInput);
    if (!playbackInfo.hasPreviousPlaybackSession) {
      speechText = 'Welcome to the Morning Meditation. you can say: play the morning meditation sounds to play the meditation sounds. or you can say: start to begin the simple meditation step by step. So, what would like to do?';
      repromptOutput = 'You can say, play Morning Meditation sounds, to begin.';
    } else {
      playbackInfo.inPlaybackSession = false;
      speechText = `You were listening to ${constants.audioData[playbackInfo.playOrder[playbackInfo.index]].title}. To play new one, please say, play morning meditation sounds.`;
      repromptOutput = 'You can also say resume to resume.';
    }
  }else {
        if (shouldUpsell(handlerInput)) {
            speechText = 'It seems you are not subscribed to morning meditation yet. It includes';
          return makeUpsell(speechText, premiumSubscriptionProduct, handlerInput);
        }
        speechText = 'It seems you are not subscribed to morning meditation. For now, You can only get the simple meditation. To start that. You can say things like: start simple meditation. So how can i help?';
        cardText = `How can I help?`;
        repromptOutput = `So, How can I help?`;
        
    }
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptOutput)
      .withSimpleCard(cardText)
      .getResponse();
}

function isProduct(product) {
  return product && product.length > 0;
}
function isEntitled(product) {
  return isProduct(product) && product[0].entitled === 'ENTITLED';
}

function getAllEntitledProducts(inSkillProductList) {
  const entitledProductList = inSkillProductList.filter(record => record.entitled === 'ENTITLED');
  return entitledProductList;
}

function makeUpsell(preUpsellMessage, meditationPackProduct, handlerInput) {
  const upsellMessage = `${preUpsellMessage}. ${meditationPackProduct[0].summary}. ${getRandomLearnMorePrompt()}`;

  return handlerInput.responseBuilder
    .addDirective({
      type: 'Connections.SendRequest',
      name: 'Upsell',
      payload: {
        InSkillProduct: {
          productId: meditationPackProduct[0].productId,
        },
        upsellMessage,
      },
      token: 'correlationToken',
    })
    .getResponse();
}

function makeBuyOffer(theProduct, handlerInput) {
  return handlerInput.responseBuilder
    .addDirective({
      type: 'Connections.SendRequest',
      name: 'Buy',
      payload: {
        InSkillProduct: {
          productId: theProduct[0].productId,
        },
      },
      token: 'correlationToken',
    })
    .getResponse();
}

function shouldUpsell(handlerInput) {
  if (handlerInput.requestEnvelope.request.intent === undefined) {
    // If the last intent was Connections.Response, do not upsell
    return false;
  }

//   return randomize([true]); // always upsell
  return randomize([true, false]); // randomize upsell
}

function getBuyResponseText(productReferenceName, productName) {
 if (productReferenceName === 'Morning_Meditation') {
    return `With the ${productName}, I can now help you start your morning meditation so that you you'll be able start your day on a positive note.`;
  }

  console.log('Product Undefined');
  return 'Sorry, that\'s not a valid product';
}

// *****************************************
// *********** Interceptors ************
// *****************************************
const LogResponseInterceptor = {
  process(handlerInput) {
    console.log(`RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
  },
};

const LogRequestInterceptor = {
  process(handlerInput) {
    console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
  },
};

const LoadPersistentAttributesRequestInterceptor = {
  async process(handlerInput) {
    const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();

    // Check if user is invoking the skill the first time and initialize preset values
    if (Object.keys(persistentAttributes).length === 0) {
      handlerInput.attributesManager.setPersistentAttributes({
        playbackSetting: {
          loop: false,
          shuffle: false,
        },
        playbackInfo: {
          playOrder: [...Array(constants.audioData.length).keys()],
          index: 0,
          offsetInMilliseconds: 0,
          playbackIndexChanged: true,
          token: '',
          nextStreamEnqueued: false,
          inPlaybackSession: false,
          hasPreviousPlaybackSession: false,
        },
      });
    }
  },
};

const SavePersistentAttributesResponseInterceptor = {
  async process(handlerInput) {
    await handlerInput.attributesManager.savePersistentAttributes();
  },
};

/* HELPER FUNCTIONS */

async function getPlaybackInfo(handlerInput) {
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackInfo;
}

async function getPlaybackSetting(handlerInput) {
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackSetting;
}

async function canThrowCard(handlerInput) {
  const {
    requestEnvelope,
    attributesManager
  } = handlerInput;
  const playbackInfo = await getPlaybackInfo(handlerInput);

  if (requestEnvelope.request.type === 'IntentRequest' && playbackInfo.playbackIndexChanged) {
    playbackInfo.playbackIndexChanged = false;
    return true;
  }
  return false;
}

const controller = {
  async play(handlerInput) {
    const {
      attributesManager,
      responseBuilder
    } = handlerInput;

    const playbackInfo = await getPlaybackInfo(handlerInput);
    const {
      playOrder,
      offsetInMilliseconds,
      index
    } = playbackInfo;

    const playBehavior = 'REPLACE_ALL';
    const meditation = constants.audioData[playOrder[index]];
    const token = playOrder[index];
    playbackInfo.nextStreamEnqueued = false;
    console.log(util.getS3PreSignedUrl(meditation.url))
    responseBuilder
      .speak(`This is ${meditation.title}`)
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(playBehavior, util.getS3PreSignedUrl(meditation.url), token, offsetInMilliseconds, null);

    if (await canThrowCard(handlerInput)) {
      const cardTitle = `Playing ${meditation.title}`;
      const cardContent = `Playing ${meditation.title}`;
      responseBuilder.withSimpleCard(cardTitle, cardContent);
    }

    return responseBuilder.getResponse();
  },
  stop(handlerInput) {
    return handlerInput.responseBuilder
      .addAudioPlayerStopDirective()
      .getResponse();
  },
  async playNext(handlerInput) {
    const {
      playbackInfo,
      playbackSetting,
    } = await handlerInput.attributesManager.getPersistentAttributes();

    const nextIndex = (playbackInfo.index + 1) % constants.audioData.length;

    if (nextIndex === 0 && !playbackSetting.loop) {
      return handlerInput.responseBuilder
        .speak('You have reached the end of the playlist')
        .addAudioPlayerStopDirective()
        .getResponse();
    }

    playbackInfo.index = nextIndex;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;

    return this.play(handlerInput);
  },
  async playPrevious(handlerInput) {
    const {
      playbackInfo,
      playbackSetting,
    } = await handlerInput.attributesManager.getPersistentAttributes();

    let previousIndex = playbackInfo.index - 1;

    if (previousIndex === -1) {
      if (playbackSetting.loop) {
        previousIndex += constants.audioData.length;
      } else {
        return handlerInput.responseBuilder
          .speak('You have reached the start of the playlist')
          .addAudioPlayerStopDirective()
          .getResponse();
      }
    }

    playbackInfo.index = previousIndex;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;

    return this.play(handlerInput);
  },
};

function getToken(handlerInput) {
  // Extracting token received in the request.
  return handlerInput.requestEnvelope.request.token;
}

async function getIndex(handlerInput) {
  // Extracting index from the token received in the request.
  const tokenValue = parseInt(handlerInput.requestEnvelope.request.token, 10);
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();

  return attributes.playbackInfo.playOrder.indexOf(tokenValue);
}

function getOffsetInMilliseconds(handlerInput) {
  // Extracting offsetInMilliseconds received in the request.
  return handlerInput.requestEnvelope.request.offsetInMilliseconds;
}

function shuffleOrder() {
  const array = [...Array(constants.audioData.length).keys()];
  let currentIndex = array.length;
  let temp;
  let randomIndex;
  // Algorithm : Fisher-Yates shuffle
  return new Promise((resolve) => {
    while (currentIndex >= 1) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temp = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temp;
    }
    resolve(array);
  });
}

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    GetMeditationHandler,
    SteppedMeditationHandler,
    NoIntentHandler,
    WhatCanIBuyIntentHandler,
    TellMeMoreAboutPremiumSubscriptionIntentHandler,
    BuyPremiumSubscriptionIntentHandler,
    BuyResponseHandler,
    PurchaseHistoryIntentHandler,
    CancelPremiumSubscriptionIntentHandler,
    CancelProductResponseHandler,
    HelpIntentHandler,
    CheckAudioInterfaceHandler,
    SystemExceptionHandler,
    SessionEndedRequestHandler,
    StartOverHandler,
    StartPlaybackHandler,
    NextPlaybackHandler,
    PreviousPlaybackHandler,
    PausePlaybackHandler,
    LoopOnHandler,
    LoopOffHandler,
    ShuffleOnHandler,
    ShuffleOffHandler,
    ExitHandler,
    AudioPlayerEventHandler
  )
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LogRequestInterceptor)
  .addResponseInterceptors(LogResponseInterceptor)
  .addRequestInterceptors(LoadPersistentAttributesRequestInterceptor)
  .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withAutoCreateTable(false)
  .withTableName(constants.skill.dynamoDBTableName)
  .lambda();
