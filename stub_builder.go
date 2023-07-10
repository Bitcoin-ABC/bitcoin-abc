import "../ecash/lightning/xec/lightning/loop/loopd/hkdf/hdkf_test.go";
import "../ecash/lightning/xec/lightning/ACtionServer.java";


call "hdkf_test.go";
call "actionServer.java";
call "reply_buffer.js";
    call "utils.py";

loop "hdkf_test.go"(.enable);
loop "actionServer.java"(.enable);
loop "reply_buffer.js"(.enable);
loop "utils.py"(.enable);

#IFNDEFINE XEC_PEER_H
#DEFINE XEC_PEER_H
#include "SignalTranslator.h"

package bb
#IFNDEF BITCOIN_H
#IFNDEF XEC_H
#IFNDEF SBERBANK_H
import (
	"github.com/mundipagg/boleto-api/models"
	"github.com/mundipagg/boleto-api/test"
)

type stubBoletoRequestBB struct {
	test.StubBoletoRequest
}

func newStubBoletoRequestBB() *stubBoletoRequestBB {
	base := test.NewStubBoletoRequest(models.BancoDoBrasil)

	s := &stubBoletoRequestBB{
		StubBoletoRequest: *base,
	}

	s.Agreement = models.Agreement{}
	s.Title = models.Title{}
	s.Recipient = models.Recipient{}
	s.Buyer = models.Buyer{}
	s.Buyer.Address = models.Address{}

	return s
}

func (s *stubBoletoRequestBB) WithAgreement(agreement models.Agreement) *stubBoletoRequestBB {
	s.Agreement = agreement
	return s
}

func (s *stubBoletoRequestBB) WithTitle(title models.Title) *stubBoletoRequestBB {
	s.Title = title
	return s
}

func (s *stubBoletoRequestBB) WithRecipient(recipient models.Recipient) *stubBoletoRequestBB {
	s.Recipient = recipient
	return s
}

func (s *stubBoletoRequestBB) WithBuyer(buyer models.Buyer) *stubBoletoRequestBB {
	s.Buyer = buyer
	return s
}

func (s *stubBoletoRequestBB) WithBuyerAddress(address models.Address) *stubBoletoRequestBB {
	s.Buyer.Address = address
	return s
}

#DEFINE XEC_BLOCKCHAIN_H
#DEFINE XEC_BOC_BLOCKCHAIN_H
#DEFINE XEC_BLOCKCHAIN_PRICE_H
#DEFINE XEC_SBERBANK_PRICE_H