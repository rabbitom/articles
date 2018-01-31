# 在Xamarin.Forms中使用SkiaSharp绘图时从原生工程中加载图片
Xamarin.Forms是一款跨平台移动开发框架，可以通过一套代码同时生成Android与iOS平台的原生应用。解决方案中一般包含三个工程，即跨平台工程、Android工程和iOS工程，在跨平台工程中实现界面和业务逻辑，在Android和iOS工程中实现API调用。当在界面中使用内嵌图片资源，比如设置<Image>图片控件的数据源时有两种方法：一是将文件以EmbededResource形式放在跨平台工程中；二是按照Android和iOS各自的机制放在对应平台工程中。后者的好处是可以根据手机的像素密度自动选择不同分辨率的图片。参考：[Images - Xamarin.Froms Guides](https://developer.xamarin.com/guides/xamarin-forms/user-interface/images/)。  
但有时候使用图片控件不能满足需求，需要用代码在界面上绘制图形。除了基本的几何图形，有可能还需要将图片文件的内容绘制到图形当中。Xamarin.Forms中使用SkiaSharp库绘图，在图片部分，官方文档中只给出了从跨平台工程中加载资源的方法（[Loading a Bitmap Resource](https://developer.xamarin.com/guides/xamarin-forms/advanced/skiasharp/basics/bitmaps/)），没有提及从原生工程加载，带来的问题是绘制出的图片在不同像素密度的手机上显示的大小不同。为此，我们探究了SkiaSharp从原生工程中加载图片的方法，主要代码如下（使用了宏来判断编译目标，只能用于SharedProject类型的跨平台工程当中）：
```
using System.Threading.Tasks;
using SkiaSharp;
using Xamarin.Forms;
#if __ANDROID__
using Xamarin.Forms.Platform.Android;
using Android.Content;
using Android.Graphics;
using SkiaSharp.Views.Android;
#else
using Xamarin.Forms.Platform.iOS;
using UIKit;
using SkiaSharp.Views.iOS;
#endif

        public async static Task<SKBitmap> BitmapFormNativeFile(string fileName)
        {
            var imageSource = ImageSource.FromFile(fileName);
            IImageSourceHandler imageLoader = new FileImageSourceHandler();
#if __ANDROID__
            if (context == null)
                throw new Exception("ImageLoader not initialized.");
            Bitmap image = await imageLoader.LoadImageAsync(imageSource, context);
#else
            UIImage image = await imageLoader.LoadImageAsync(imageSource);
#endif
            return image.ToSKBitmap();
        }
```
以上代码的关键有两点：
1. Xamarin.Forms在不同平台上（Xamarin.Forms.Platform.Android和Xamarin.Forms.Platform.iOS）提供了同名的FileImageSourceHandler类，可以通过文件名获取到原生图片对象（Android的Bitmap和iOS的UIImage）；
1. SkiaSharp在不同平台上（SkiaSharp.Views.Android和SkiaSharp.Views.iOS）的Extension为原生图片类添加了ToSKBitmap()方法，可以对象转换为SkiaSharp里的图片对象。参考：[SkiaSharp iOSExtensions](https://developer.xamarin.com/api/type/SkiaSharp.Views.iOS.iOSExtensions/)、[SkiaSharp AndroidExtensions](https://developer.xamarin.com/api/type/SkiaSharp.Views.Android.AndroidExtensions/)。

以上代码在Android平台上运行正常，但在iOS平台上，图片的透明部分会显示出异常的花纹，如下图所示（左边是理想情况，右边是实际显示效果）：  
![drawing native bitmap is abnormal on iOS](images/skiasharp-draw-bitmap-abnormal.png)  
为了查找问题原因，我们到GitHub上打开[SkiaSharp](https://github.com/mono/SkiaSharp)的源码仓库，搜索[ToSKBitmap](https://github.com/mono/SkiaSharp/search?p=1&q=ToSKBitmap&type=&utf8=%E2%9C%93)方法，找到了它的实现：[AppleExtensions.cs](https://github.com/mono/SkiaSharp/blob/2cb59abeee036e3a369fd3c8a51a40cfb65e5eea/source/SkiaSharp.Views/SkiaSharp.Views.Apple/AppleExtensions.cs)。经过分析，ToSKBitmap的原理是新建一个SKBitmap，获取其内存空间，然后通过iOS CoreGraphics中的方法将图片绘制到这块内存当中。至此，我们可以推测出问题的原因：CoreGraphics绘图的过程中，对于全透明的像素点，不会覆盖目标内存中的值，因为它默认目标内存已经初始化为全零，但实际上新创建的SKBitmap还没有被擦除过，内存空间中的内容是不确定的。解决方法很简单，我们将ToSKBitmap的实现复制到自己的代码中，在绘图之前将Bitmap擦除一下：
```
SKCanvas canvas = new SKCanvas(bitmap);
canvas.Clear();
canvas.Flush();
```
也可以用CoreGraphics的方法擦除，效果一样：
```
context.ClearRect(new CGRect(0, 0, cgImage.Width, cgImage.Height));
```
修改后问题得以解决。

参考：
* 示例工程：[SkiaSharpDrawBitmapDemo](https://github.com/rabbitom/SkiaSharpDrawBitmapDemo)
* 可复用的工具类：[ImageUtils.cs](https://gitee.com/erabbit/codes/2u3578fxozcbrshqjvmgl84)
* Xamarin论坛中类似问题的讨论：[Creating SKImage from resources (within forms)](https://forums.xamarin.com/discussion/102129/creating-skimage-from-resources-within-forms)
* 为已经存在的类添加方法：[扩展方法 - C#编程指南](https://docs.microsoft.com/zh-cn/dotnet/csharp/programming-guide/classes-and-structs/extension-methods)，这与Objective-C中的Category机制类似
* StackOverflow上对CoreGraphics绘图时填充背景的讨论：[Problems with CGbitmapcontext and alpha](https://stackoverflow.com/questions/23415095/problems-with-cgbitmapcontext-and-alpha)
* GitHub Issue：[ToSKBitmap draws abnormal pixels for transparent pixels in original image](https://github.com/mono/SkiaSharp/issues/439)
