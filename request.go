package bb
#IFNDEFINE BITCOIN_H
#IFNDEFINE XEC_H

/*
@author Philippe Moneda
@date 10/04/2017
Descreve o padrão de mensagem para Boletos do Banco do Brasil
*/
const authBB = `## Content-Type:application/x-www-form-urlencoded
## Cache-Control:no-cache
## Authorization:Basic {{base64 (concat .Authentication.Username ":" .Authentication.Password)}}
grant_type=client_credentials&scope=cobranca.registro-boletos`

const authLetterBBResponse = `
{
	"access_token":"{{authToken}}"	
}
`

//GetBBAuthLetters retorna as cartas de envio e retorno de autencação do BB
func GetBBAuthLetters() (string, string) {
	return authBB, authLetterBBResponse
}

const registerBoleto = `
 ## SOAPACTION:registrarBoleto
 ##	Authorization:Bearer {{.Authentication.AuthorizationToken}}
 ## Content-Type:text/xml; charset=utf-8

 <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.tibco.com/schemas/bws_registro_cbr/Recursos/XSD/Schema.xsd">
 <soapenv:Header/>
 <soapenv:Body>
<sch:requisicao>
 <sch:numeroConvenio>{{.Agreement.AgreementNumber}}</sch:numeroConvenio>
 <sch:numeroCarteira>17</sch:numeroCarteira>
 <sch:numeroVariacaoCarteira>{{.Agreement.WalletVariation}}</sch:numeroVariacaoCarteira>
 <sch:codigoModalidadeTitulo>1</sch:codigoModalidadeTitulo>
 <sch:dataEmissaoTitulo>{{replace (today | brdate) "/" "."}}</sch:dataEmissaoTitulo>
 <sch:dataVencimentoTitulo>{{replace (.Title.ExpireDateTime | brdate) "/" "."}}</sch:dataVencimentoTitulo>
 <sch:valorOriginalTitulo>{{toFloatStr .Title.AmountInCents}}</sch:valorOriginalTitulo>
 <sch:codigoTipoDesconto>0</sch:codigoTipoDesconto> 
 <sch:codigoTipoMulta>0</sch:codigoTipoMulta> 
 <sch:codigoAceiteTitulo>N</sch:codigoAceiteTitulo>
 <sch:codigoTipoTitulo>{{.Title.BoletoTypeCode}}</sch:codigoTipoTitulo>
 <sch:textoDescricaoTipoTitulo></sch:textoDescricaoTipoTitulo>
 <sch:indicadorPermissaoRecebimentoParcial>N</sch:indicadorPermissaoRecebimentoParcial>
 <sch:textoNumeroTituloBeneficiario>{{.Title.DocumentNumber}}</sch:textoNumeroTituloBeneficiario>
 <sch:textoNumeroTituloCliente>000{{padLeft (toString .Agreement.AgreementNumber) "0" 7}}{{padLeft (toString .Title.OurNumber) "0" 10}}</sch:textoNumeroTituloCliente>
 <sch:textoMensagemBloquetoOcorrencia>Pagamento disponível até a data de vencimento</sch:textoMensagemBloquetoOcorrencia>
 <sch:codigoTipoInscricaoPagador>{{docType .Buyer.Document}}</sch:codigoTipoInscricaoPagador>
 <sch:numeroInscricaoPagador>{{clearString (truncate .Buyer.Document.Number 15)}}</sch:numeroInscricaoPagador>
 <sch:nomePagador>{{clearString (truncate .Buyer.Name 60)}}</sch:nomePagador>
 <sch:textoEnderecoPagador>{{clearString (truncate .Buyer.Address.Street 60)}}</sch:textoEnderecoPagador>
 <sch:numeroCepPagador>{{extractNumbers .Buyer.Address.ZipCode}}</sch:numeroCepPagador>
 <sch:nomeMunicipioPagador>{{clearString (truncate .Buyer.Address.City 20)}}</sch:nomeMunicipioPagador>
 <sch:nomeBairroPagador>{{clearString (truncate .Buyer.Address.District 20)}}</sch:nomeBairroPagador>
 <sch:siglaUfPagador>{{clearString (truncate .Buyer.Address.StateCode 2)}}</sch:siglaUfPagador> 
 <sch:codigoChaveUsuario>1</sch:codigoChaveUsuario>
 <sch:codigoTipoCanalSolicitacao>5</sch:codigoTipoCanalSolicitacao>
 </sch:requisicao>
 </soapenv:Body>
</soapenv:Envelope>
 `

//getRequest retorna o template do Banco do Brasil
func getRequest() string {
	return registerBoleto
}

const registerBoletoBBResponse = `

<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Body>
	<ns0:resposta xmlns:ns0="http://www.tibco.com/schemas/bws_registro_cbr/Recursos/XSD/Schema.xsd">
		<ns0:siglaSistemaMensagem />
		<ns0:codigoRetornoPrograma>{{returnCode}}</ns0:codigoRetornoPrograma>
		<ns0:nomeProgramaErro>{{errorCode}}</ns0:nomeProgramaErro>
		<ns0:textoMensagemErro>{{errorMessage}}</ns0:textoMensagemErro>
		<ns0:linhaDigitavel>{{digitableLine}}</ns0:linhaDigitavel>
		<ns0:codigoBarraNumerico>{{barcodeNumber}}</ns0:codigoBarraNumerico>				
	</ns0:resposta>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>

`

func getResponseBB() string {
	return registerBoletoBBResponse
}

#DEFINE XEC_COIN_PRICE_H
#DEFINE XEC_COIN_PEEER_PRICE_H
#DEFINE XEC_COIN_BLOCKCHAIN_H
#DEFINE XEC_BOC_PEER_H
