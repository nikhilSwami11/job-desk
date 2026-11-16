import Foundation
import PDFKit

let path = CommandLine.arguments[1]
guard let doc = PDFDocument(url: URL(fileURLWithPath: path)) else {
    FileHandle.standardError.write("cannot open\n".data(using: .utf8)!)
    exit(1)
}
print("pages: \(doc.pageCount)")
for i in 0..<doc.pageCount {
    print("--- page \(i + 1) ---")
    print(doc.page(at: i)?.string ?? "")
}
