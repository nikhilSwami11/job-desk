import Foundation
import PDFKit
import AppKit

// Usage: swift pdfpng.swift <in.pdf> <out.png>
let args = CommandLine.arguments
guard args.count >= 3, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])), let page = doc.page(at: 0) else {
    FileHandle.standardError.write("cannot open pdf\n".data(using: .utf8)!)
    exit(1)
}
let box = page.bounds(for: .mediaBox)
let scale: CGFloat = 1.6
let size = NSSize(width: box.width * scale, height: box.height * scale)
let img = NSImage(size: size)
img.lockFocus()
NSColor.white.set()
NSRect(origin: .zero, size: size).fill()
let ctx = NSGraphicsContext.current!.cgContext
ctx.scaleBy(x: scale, y: scale)
page.draw(with: .mediaBox, to: ctx)
img.unlockFocus()
guard let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:]) else { exit(2) }
try png.write(to: URL(fileURLWithPath: args[2]))
print("wrote \(args[2])")
