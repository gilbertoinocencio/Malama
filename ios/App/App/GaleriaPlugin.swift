import Foundation
import UIKit
import Capacitor
import PhotosUI

/**
 * Seletor de fotos que abre a biblioteca DIRETO, sem a folha de opções do iOS.
 *
 * Por que código próprio em vez de um plugin pronto: tanto o `@capacitor/camera`
 * quanto o `@capawesome/capacitor-file-picker` constroem o picker com
 * `PHPickerConfiguration(photoLibrary:)`. Esse inicializador amarra o picker à
 * autorização de fotos do app — em modo "Limited" a galeria abre vazia. Aqui
 * usamos `PHPickerConfiguration()` sem parâmetro: o picker roda fora do processo
 * do app, enxerga a biblioteca inteira e NÃO exige autorização nenhuma.
 *
 * E por que não o `<input type="file">` do WebView: ele sempre apresenta a folha
 * "Fototeca / Tirar Foto / Escolher Arquivo", e não existe atributo HTML que
 * force ir direto para a biblioteca (`capture` só resolve o caminho da câmera).
 */
@objc(GaleriaPlugin)
public class GaleriaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GaleriaPlugin"
    public let jsName = "Galeria"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "escolherImagem", returnType: CAPPluginReturnPromise)
    ]

    private var chamadaPendente: CAPPluginCall?
    private var ladoMaximo: CGFloat = 1600

    @objc public func escolherImagem(_ call: CAPPluginCall) {
        chamadaPendente = call
        ladoMaximo = CGFloat(call.getInt("ladoMaximo") ?? 1600)

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            var configuracao = PHPickerConfiguration()
            configuracao.filter = .images
            configuracao.selectionLimit = 1

            let picker = PHPickerViewController(configuration: configuracao)
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    /// Reduz antes de virar base64: uma captura de 12MP vira uma string enorme,
    /// e o WebView paga esse custo na thread principal.
    private func redimensionar(_ imagem: UIImage) -> UIImage {
        let maiorLado = max(imagem.size.width, imagem.size.height)
        guard maiorLado > ladoMaximo else { return imagem }

        let fator = ladoMaximo / maiorLado
        let novoTamanho = CGSize(width: imagem.size.width * fator,
                                 height: imagem.size.height * fator)

        // scale = 1 de propósito: sem isso o renderer multiplica pela densidade
        // da tela e devolve uma imagem 2x/3x maior do que a pedida.
        let formato = UIGraphicsImageRendererFormat.default()
        formato.scale = 1

        return UIGraphicsImageRenderer(size: novoTamanho, format: formato).image { _ in
            imagem.draw(in: CGRect(origin: .zero, size: novoTamanho))
        }
    }
}

extension GaleriaPlugin: PHPickerViewControllerDelegate {
    public func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)

        guard let call = chamadaPendente else { return }
        chamadaPendente = nil

        // Fechar sem escolher é fluxo normal, não erro: quem chama decide.
        guard let provedor = results.first?.itemProvider,
              provedor.canLoadObject(ofClass: UIImage.self) else {
            call.resolve(["cancelado": true])
            return
        }

        provedor.loadObject(ofClass: UIImage.self) { [weak self] objeto, erro in
            if let erro = erro {
                call.reject("Falha ao ler a imagem: \(erro.localizedDescription)")
                return
            }
            guard let self = self,
                  let imagem = objeto as? UIImage,
                  let dados = self.redimensionar(imagem).jpegData(compressionQuality: 0.72) else {
                call.reject("Não foi possível converter a imagem.")
                return
            }
            call.resolve([
                "dataUrl": "data:image/jpeg;base64," + dados.base64EncodedString()
            ])
        }
    }
}
