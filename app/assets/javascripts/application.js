/* global $ */

// Warn about using the kit in production
if (window.console && window.console.info) {
  window.console.info('GOV.UK Prototype Kit - do not use for production')
}

$(document).ready(function () {
  window.GOVUKFrontend.initAll()
  MOJFrontend.initAll();

  // postcode lookup
  $('#find-address, .postcode_change a').click(function() {
    $('.togglePostcode').toggleClass('govuk-visually-hidden');
    var postcode = $('input#postcode').val();
    $('label.postcode_change').text(postcode);
  });

  // status tags
  $('.not_started, .blocked').find('.govuk-tag').addClass("govuk-tag--grey");
  $('.in_progress').find('.govuk-tag').addClass("govuk-tag--blue");

  $('#clear-search').on('click', function (e) {
    e.preventDefault()
    $('.search-field').val("");
    $('.search-field').focus();
  });

  $('.govuk-checkboxes__input').on('click', function (e) {
    let offenceName = e.currentTarget.attributes.offencename.value
    let offenceClass = e.currentTarget.attributes.offenceclass.value

    setOffencesAddedHeading()
     
    if(this.checked) {
      var $div = $('div[id^="govuk-summary-list__row"]:last');
      var nextRowNumber = parseInt($div.prop("id").match(/\d+/g), 10 ) + 1;
      var $nextRow = $div.clone().prop('id', `govuk-summary-list__row-${nextRowNumber}`).removeAttr('style')                        
      $div.after($nextRow);
      $(`#govuk-summary-list__row-${nextRowNumber} .offence-name`).text(offenceName);
      $(`#govuk-summary-list__row-${nextRowNumber} .govuk-hint`).text(`Class ${offenceClass}`);
    } else {
      $(".offence-name:contains('" + offenceName + "')").parent().parent().remove();
    }
  });

  $('body').on('click', '#remove-offence-link', function(e) {
    e.preventDefault()
    var offenceName = $(this).parent().siblings()[0].firstElementChild.innerHTML.replace(/&amp;/g, '&');
    $("[offencename='" + offenceName + "']" ).prop('checked', false);
    $("dd:contains('" + offenceName + "')").parent().remove();
    
    setOffencesAddedHeading()
  });
 
  function setOffencesAddedHeading() {
    totalSelected = $('input:checkbox:checked').length
    var text
    if (totalSelected == 1) {
      text = `You have added 1 offence`
    } else {
      text = `You have added ${totalSelected} offences`
    }
    $('.govuk-grid-row .govuk-grid-column-two-thirds-from-desktop .govuk-heading-m').text(text)
  }

  // file uploads
  var fileUpload = $('.moj-multi-file-upload');
  if(fileUpload && typeof MOJFrontend.MultiFileUpload !== 'undefined') {
    new MOJFrontend.MultiFileUpload({
      container: $('.moj-multi-file-upload'),
      uploadUrl: '/ajax-upload-url',
      deleteUrl: '/ajax-delete-url'
    });
  }
})
