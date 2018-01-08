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

参考：
* 完整的代码文件：[ImageUtils.cs](https://gitee.com/erabbit/codes/2u3578fxozcbrshqjvmgl84)
* Xamarin论坛中类似问题的讨论：[Creating SKImage from resources (within forms)](https://forums.xamarin.com/discussion/102129/creating-skimage-from-resources-within-forms)
* 为已经存在的类添加方法：[扩展方法 - C#编程指南](https://docs.microsoft.com/zh-cn/dotnet/csharp/programming-guide/classes-and-structs/extension-methods)，这与Objective-C中的Category机制类似
