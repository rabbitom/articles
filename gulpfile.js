var gulp = require('gulp');
var compileSlides = require('./scripts/slides.js');

gulp.task('slides', function() {
    compileSlides('teamup-survey-slides.md');
});

gulp.task('watch', function() {
    gulp.watch('teamup-survey-slides.md', ['slides']);
    //gulp.watch('./*-slides.md', ['slides']);
});

// Default Task
gulp.task('default', ['slides', 'watch']);