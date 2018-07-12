# 将Spring Boot应用部署到Azure应用服务中的几种方法
传统的Java Web应用通常编译为war包，以Servlet的形式放在Tomcat、Jetty等Web容器中运行。Spring Boot通过内嵌Tomcat，将应用编译成jar包的形式，可以通过`java -jar filename.jar`直接运行。  
Azure是微软的公有云服务，在Azure上部署Web应用主要有以下几种方式：
* [应用服务（App Service）](https://docs.azure.cn/zh-cn/app-service/)，PaaS服务，全托管的环境，开发者只需要向FTP服务器或git仓库推送代码即可完成部署；
* [云服务（Cloud Service）](https://docs.azure.cn/zh-cn/cloud-services/)，可以结合Web实例（通过 IIS自动部署和托管应用）和辅助实例（不使用IIS，独立运行应用）构建应用，相对于应用服务更加灵活，可以自己登录到实例上进行控制；
* 虚拟机（VM），开通虚拟机后，自己在操作系统上安装JDK、Tomcat等，并将war包或jar包放到上面运行；
* 容器（Docker），开发者将应用打包为docker镜像，放到虚拟机上运行，并且可以进一步拓展为微服务架构，通过[Service Fabric](https://docs.azure.cn/zh-cn/service-fabric/)调度和管理。

在这几种方式中，最方便的当属应用服务（App Service）。本文整理了官方文档中几种将Spring Boot应用部署到应用服务的具体方法。  
## 1. 通过IDE插件一键发布  
这是最简单的方法，Azure提供了Eclipse和IntelliJ IDEA的插件（通过[Visual Studio](https://visualstudio.microsoft.com/zh-hans/vs/features/azure/)应该也是可以的，没有确认）：  
* Eclipse: [在 Azure 中创建第一个 Java Web 应用 | Azure Docs](https://docs.azure.cn/zh-cn/app-service/app-service-web-get-started-java)  
* IntelliJ IDEA: [在 IntelliJ 中创建基本的 Azure Web 应用 | Azure Docs](https://docs.azure.cn/zh-cn/java/intellij/azure-toolkit-for-intellij-create-hello-world-web-app)  

上面两篇文章中的示例工程是基于JSP页面的，对于Spring Boot工程，过程也是一样的。  
关于IntelliJ IDEA插件的安装与登录国内版账号：
* [安装 Azure Toolkit for IntelliJ | Azure Docs](https://docs.azure.cn/zh-cn/java/intellij/azure-toolkit-for-intellij-installation)
* [用于 IntelliJ 的 Azure 工具包的登录说明 | Azure Docs](https://docs.azure.cn/zh-cn/java/intellij/azure-toolkit-for-intellij-sign-in-instructions)
## 2. 手动创建应用服务，在本地编译Jar包，推送代码
这种方法的原理与第一种完全一样，插件相当于将整个过程自动化了。具体操作步骤详见这篇发表在MSDN博客上的文章：[Deploy Java 8 Spring Boot API to Azure App Service – Cloud Solution Architect](https://blogs.msdn.microsoft.com/cloud_solution_architect/2016/11/23/deploy-java-8-spring-boot-api-to-azure-app-service/)  
其中创建应用服务可以如文中所介绍通过Azure Cloud Shell，也可以通过在本地运行Azure CLI，或者登录到portal，在图形界面中操作。  
对于推送代码，文章中介绍的是git方式，插件中用的是FTP。
## 3. 通过Azure App Service的maven插件
这种方法不需要IDE，可以在命令行完成，并且通过修改pom.xml文件和Application类，将Spring Boot应用编译成了war包。  
详见：[使用 Maven 和 Azure 将 Spring Boot 应用部署到云中 | Azure Docs](https://docs.azure.cn/zh-cn/java/spring-framework/deploy-spring-boot-java-app-with-maven-plugin)，英文原版：
[Deploy a Spring Boot app to the cloud with Maven and Azure | Microsoft Docs](https://docs.microsoft.com/en-us/java/azure/spring-framework/deploy-spring-boot-java-app-with-maven-plugin?view=azure-java-stable)
## 4. 使用同样的maven插件，但以docker形式打包和发布
详见：[How to use the Maven Plugin for Azure Web Apps to deploy a Spring Boot app in Azure Container Registry to Azure App Service | Microsoft Docs](https://docs.microsoft.com/en-us/java/azure/spring-framework/deploy-spring-boot-java-app-from-container-registry-using-maven-plugin?view=azure-java-stable#deploy-your-spring-boot-web-app-to-azure)  
这种方法与上一种的不同之处首先在于，本地编译出来的不再是war包，也不是jar包，而是docker镜像。上一种使用的示例工程是，这一种是。  
并且接下来先将镜像发布到Azure Container Registry，然后再部署到App Service中，对应的pom.xml文件中，在maven插件的配置中少了`<deploymentType>`，多了`<containerSettings>`，对比如下：
* war包形式：
    ```
    <plugin>
    <groupId>com.microsoft.azure</groupId>
    <artifactId>azure-webapp-maven-plugin</artifactId>
    <!-- Check latest version on Maven Central -->
    <version>1.1.0</version>
    <configuration>
        <resourceGroup>maven-projects</resourceGroup>
        <appName>${project.artifactId}-${maven.build.timestamp}</appName>
        <region>westus</region>
        <javaVersion>1.8</javaVersion>
        <deploymentType>war</deploymentType>
    </configuration>
    </plugin>
    ```
* docker形式：
    ```
    <plugin>
    <groupId>com.microsoft.azure</groupId>
    <artifactId>azure-webapp-maven-plugin</artifactId>
    <version>0.1.3</version>
    <configuration>
        <authentication>
            <serverId>azure-auth</serverId>
        </authentication>
        <resourceGroup>wingtiptoysresources</resourceGroup>
        <appName>maven-linux-app-${maven.build.timestamp}</appName>
        <region>westus</region>
        <containerSettings>
            <imageName>${docker.image.prefix}/${project.artifactId}</imageName>
            <registryUrl>https://${docker.image.prefix}</registryUrl>
            <serverId>${azure.containerRegistry}</serverId>
        </containerSettings>
        <appSettings>
            <property>
                <name>PORT</name>
                <value>8080</value>
            </property>
        </appSettings>
    </configuration>
    </plugin>
    ```
因为使用了同样的maven插件，两种方法最终部署应用的命令是一样的：`mvn azure-webapp:deploy`。  
另外，国内版的Azure应用服务暂时还不支持容器应用，所以这种方法不适用。对比国内版与国际版的应用服务：[Azure应用服务 - Azure云计算](https://www.azure.cn/zh-cn/home/features/app-service/) vs [Azure 应用服务 - 应用托管 | Microsoft Azure](https://azure.microsoft.com/zh-cn/services/app-service/)。
## 5. 使用IntelliJ的插件发布docker
最后要介绍的方法与上一种一样，在本地编译的是docker项目，并且借助了在第一种方法中介绍过的IDE插件，但最终并没有发布到应用服务，而是发布到了Docker主机上。详见：[使用用于 IntelliJ 的 Azure 工具包将 Spring Boot 应用作为 Docker 容器发布 | Azure Docs](https://docs.azure.cn/zh-cn/java/intellij/azure-toolkit-for-intellij-publish-spring-boot-docker-app)
## 补充阅读
* [Azure 应用服务、虚拟机、Service Fabric 和云服务的比较 | Azure Docs](https://docs.azure.cn/zh-cn/app-service/choose-web-site-cloud-service-vm)
* [Deploying Spring Boot Applications](https://spring.io/blog/2014/03/07/deploying-spring-boot-applications)
* [Visual Studio Code and Azure App Service - a perfect fit | 博客 | Microsoft Azure](https://azure.microsoft.com/zh-cn/blog/visual-studio-code-and-azure-app-service-a-perfect-fit/)
## 持续集成
* [Build and deploy Java projects with VSTS | Microsoft Docs](https://docs.microsoft.com/en-us/vsts/java/?view=vsts)
* [Use Jenkins to deploy your web apps to Azure | Microsoft Docs](https://docs.microsoft.com/en-us/azure/jenkins/java-deploy-webapp-tutorial)
* [Create a CI/CD pipeline for Java with the Azure DevOps Project | Microsoft Docs](https://docs.microsoft.com/en-us/azure/devops-project/azure-devops-project-java)
## MySQL数据库
* [Azure MySQL数据库_数据库托管服务 - Azure云计算](https://www.azure.cn/zh-cn/home/features/mysql/)
* [MySQL Database on Azure快速入门指南 | Azure Docs](https://docs.azure.cn/zh-cn/mysql/mysql-database-get-started#step1)
* [Announcing MySQL in-app for Web Apps (Windows) | Azure App Service Team Blog](https://blogs.msdn.microsoft.com/appserviceteam/2016/08/18/announcing-mysql-in-app-preview-for-web-apps/)
## API应用
* [应用程序网关 - Azure云计算](https://www.azure.cn/zh-cn/home/features/application-gateway/)
* [Azure API 管理 - Azure云计算](https://www.azure.cn/zh-cn/home/features/api-management/)
