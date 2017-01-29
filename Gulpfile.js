var gulp = require('gulp'),
runSequence = require('run-sequence'),
plumber = require('gulp-plumber'),
clean = require('gulp-clean'),
newer = require('gulp-newer'),
concat = require('gulp-concat'),
uglify = require('gulp-uglify'),
rename = require('gulp-rename'),
sourcemaps = require('gulp-sourcemaps'),
minifycss = require('gulp-minify-css'),
minifyhtml = require('gulp-minify-html'),
imagemin = require('gulp-imagemin'),
pngquant = require('imagemin-pngquant'),
jshint = require('gulp-jshint'),
stylish = require('jshint-stylish'),
jshintfileoutput = require('gulp-jshint-html-reporter'),
ts = require('gulp-typescript'),
tslint = require('gulp-tslint'),
tsstylish = require('gulp-tslint-stylish'),
sass = require('gulp-ruby-sass'),
scsslint = require('gulp-scss-lint'),
watch = require('gulp-watch'),
replace = require('gulp-replace-task'),
args = require('yargs').argv,
fs = require('fs');

var cfg = require('./gulp-config.json');

var onError = function(err) {
    console.log(err);
};

gulp.task('default', function() {
    runSequence('clean-dist', 'copy',
        ['minifyhtml', 'minifyimage', 'grunt-merge-json:menu', 'jshint', 'tscompile',
            'tslint', 'sass', 'scsslint'],
        ['uglifyalljs', 'minifycss'],
        'watch');
});

gulp.task('clean-dist', function () {
    return gulp.src(cfg.paths.dist.root, {read: false})
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(clean());
});

gulp.task('copy', function () {
    return gulp.src(cfg.paths.copy)
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(newer(cfg.paths.dist.root))
        .pipe(gulp.dest(cfg.paths.dist.root));
});

gulp.task('uglifyalljs', function () {
    return gulp.src(['dist/**/*.js', '!/**/*.min.js', '!dist/core/lib/**/*', '!dist/core/common/**/*'],
        { base: 'dist/./' })
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(rename({
            extname: '.min.js'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/./'));
});

gulp.task('minifycss', ['copy'], function () {
    return gulp.src(['dist/**/*.css', '!/**/*.min.css', '!dist/core/lib/**/*'], { base: 'dist/./' })
        .pipe(sourcemaps.init())
        .pipe(minifycss())
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/./'));
});

gulp.task('minifyhtml', function () {
    return gulp.src(['dist/**/*.html', '!/**/*.min.html', '!dist/core/lib/**/*'], { base: 'dist/./' })
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sourcemaps.init())
        .pipe(minifyhtml())
        .pipe(rename({
            extname: '.min.html'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/./'));
});

gulp.task('minifyimage', function () {
    return gulp.src(['dist/**/*.{png,jpg,gif,ico}', '!dist/core/lib/**/*.*', '!dist/core/css/**/*.*'])
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(imagemin({ progressive: true, optimizationLevel: 7, use: [pngquant()] }))
        .pipe(gulp.dest('dist/./'));
});

// -------------------------------------------------
// Grunt configuration
require('gulp-grunt')(gulp, {
    // These are the default options but included here for readability.
    base: null,
    prefix: 'grunt-',
    verbose: false
});
// -------------------------------------------------

gulp.task('inject', function() {
    var wiredep = require('wiredep').stream;
    var inject = require('gulp-inject');
    var options = {
        bowerJson: require(config.paths.bower),
        directory: config.paths.dist.vendor,
        ignorePath: '../../public'
    };

    return gulp.src(config.paths.jadeFiles)
        .pipe(wiredep(options))
        .pipe(inject(gulp.src(config.paths.inject, {read: false}), {ignorePath: '/public'}))
        .pipe(gulp.dest(config.paths.views));
});

gulp.task('jshint', function () {
    return gulp.src(['./dist/**/*.js', '!dist/core/lib/**/*.*', '!**/*.min.js', '!dist/core/css/**/*.*'])
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter(stylish))
        .pipe(jshint.reporter('gulp-jshint-html-reporter', { filename: 'jshint-output.html' }));
});

gulp.task('tscompile', function () {
    return gulp.src(['./dist/**/*.ts', '!dist/core/lib/**/*.*', '!dist/core/css/**/*.*'])
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sourcemaps.init())
        .pipe(ts({
            target: 'ES5',
            declarationFiles: false,
            noResolve: true
        }))
        .pipe(rename({extname: '.js'}))
        .pipe(gulp.dest('dist/./'));
});

gulp.task('tslint', ['copy'], function () {
    return gulp.src(['./dist/**/*.ts', '!dist/core/lib/**/*.*', '!dist/core/css/**/*.*'])
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report({
            emitError: false,
            sort: true,
            bell: true
        }));
});

gulp.task("sass", function() {
    var opts = {
        compass: true,
        sourcemap: false,
        style: "expanded"
    };

    return sass(cfg.paths.styles, opts)
        .on("error", sass.logError)
        .pipe(gulp.dest(cfg.paths.dist.styles));
});

gulp.task("scsslint", function() {
    var opts = {
        'config': "lint.yml",
        'filePipeOutput': "scss.json"
    };

    return gulp.src(cfg.paths.styles)
        .pipe(scsslint(opts))
        .pipe(scsslint.failReporter("E"))
        .pipe(gulp.dest("./reports/sass"));
});

gulp.task('watch', function () {

    // ---------------------------------------------------------------
    // Watching JS files
    // ---------------------------------------------------------------
    // Copy all files except *.js files.
    gulp.watch(['src/**/*', '!src/**/*.js', '!bower_components/**.*'], function () { runSequence('copy'); });

    // Annotates and copies *.js files
    gulp.watch(['src/**/*.js',
        '!src/core/config/route.config.js', '!src/apps/**/route.config.js',
        '!bower_components/**/*.js'], function () { runSequence('watch:annotate', 'copy'); });

    // routeConfig file changes.
    gulp.watch(['src/core/config/route.config.js', 'src/apps/**/route.config.js'], function () { runSequence('routeconfig'); });

    // Uglify JS files
    gulp.watch(['dist/**/*.js', '!dist/**/*.min.js', '!dist/core/lib/**/*', '!dist/core/common/**/*'], function () { runSequence('uglifyalljs'); });


    // ---------------------------------------------------------------
    // Watching Bower components
    // ---------------------------------------------------------------
    gulp.watch(['bower_components/**/*.js'], function () { runSequence('libs'); });
    // TODO: Add other bower component types like css, scss and images


    // ---------------------------------------------------------------
    // Watching css and scss files
    // ---------------------------------------------------------------
    gulp.watch(['dist/**/*.css', '!dist/**/*.min.css', '!dist/core/lib/**/*'], function () { runSequence('minifycss'); });
    gulp.watch(['dist/**/*.scss', '!dist/core/lib/**/*'], function () { runSequence('sass'); });

    // ---------------------------------------------------------------
    // Watching TypeScript files
    // ---------------------------------------------------------------
    gulp.watch(['dist/**/*.ts', '!dist/core/lib/**/*.*', '!dist/core/css/**/*.*'], function () { runSequence('tscompile'); });

    // ---------------------------------------------------------------
    // Watch - Execute linters
    // ---------------------------------------------------------------
    gulp.watch(['dist/**/*.ts', '!dist/core/lib/**/*.*', '!dist/core/css/**/*.*'], function () { runSequence('tslint'); });
    //gulp.watch(['dist/**/*.js', '!dist/core/lib/**/*.*', '!dist/**/*.min.js', '!dist/core/css/**/*.*'], function() { runSequence('jshint'); });


    gulp.watch(['dist/**/*.js', '!dist/core/lib/**/*.*', '!dist/**/*.min.js', '!dist/core/css/**/*.*'], ['jshint']);

    // ---------------------------------------------------------------
    // Watching image files
    // ---------------------------------------------------------------
    // unable to get this watch to ever notice a file changed.  This will be handled on the initial build.
    //gulp.watch(['dist/**/*.{png,jpg,gif,ico}', '!dist/core/lib/**/*.*', '!dist/core/css/**/*.*'], function() { runSequence('minifyimage'); });

});

// ---------------------------------------------------------------
// Watch specific tasks.  This is to support the use of newer.
// ---------------------------------------------------------------
gulp.task('watch:annotate', function () {
    return gulp.src(['src/index.controller.js', 'src/core/**/*.js', 'src/apps/**/*.js', '!src/core/lib/**/*', '!/**/*.min.js'], { base: 'src/./' })
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(newer('src/./'))
        .pipe(ngAnnotate())
        .pipe(gulp.dest('src/./'));
});

gulp.task('setEnv', function () {
    // Get the environment from the command line
    var env = args.env || 'localdev';

    // Read the settings from the right file
    var filename = 'env.config.' + env + '.json';
    var settings = JSON.parse(fs.readFileSync('dist/' + filename, 'utf8'));

    // Replace each placeholder with the correct value for the variable.
    gulp.src('src/app.js')
        .pipe(replace({
            patterns: [
                {
                    match: 'myFirstApi',
                    replacement: settings. myFirstApi
                },
                {
                    match: 'mySecondApi',
                    replacement: settings. mySecondApi
                },
            ]
        }))
        .pipe(gulp.dest('dist/./'));
});